import fs from 'fs';
import path, { resolve } from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Chrome from 'selenium-webdriver/chrome.js'
import { Browser, Builder, until, By } from 'selenium-webdriver';
import { Key, keyboard , screen,  imageResource, mouse, Point } from '@nut-tree-fork/nut-js';
import clipboardy from 'clipboardy';
import { dir, error } from 'console';
import { windowManager } from 'node-window-manager';
import { exec } from 'child_process';
import { rejects } from 'assert';
import { stderr, stdout } from 'process';

async function findImagePosition(imagePath) {
    const absolutePath = path.resolve(imagePath);
    const command = `python findScreenPos.py "${absolutePath}"`;
    return new Promise((resolve,rejects) => {
        exec(command, (error,stdout,stderr) => {
            if (error) {
                console.error(`Error on Python: ${error.message}`);
                return rejects(error);
              }

              if (stderr) {
                console.warn(`stderr: ${stderr}`);
              }

              const output = stdout.trim();
              console.log(`Result from Python: ${output}`);

              // Phân tích kết quả trả về
              const result = output.split(';');
              const found = result[0] === 'y';

              if (found) {
                const x = parseInt(result[1]);
                const y = parseInt(result[2]);
                const width = parseInt(result[3]);
                const height = parseInt(result[4]);

                resolve({ found, x, y, width, height });
              } else {
                resolve({ found: false, x: 0, y: 0, width: 0, height: 0 });
              }
            });
        });
}

screen.config.resourceDirectory = "./resources";
screen.config.confidence = 0.8;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _openChromeCommand =  'chrome --profile-directory="Default" https://dashboard.teneo.pro/auth --new-window --start-maximized'

async function leftClick(location, offsetX=0, offsetY=0) {
    try{
        await mouse.setPosition(new Point(location.x + offsetX, location.y + offsetY));
        await mouse.leftClick();
        await new Promise(resolve => setTimeout(resolve,100));
    } catch (error)
    {
        console.log(chalk.red(`Error on leftClick: ${error}`));
    }
}

function moveWindowToTopLeft(titleKeyword) {
    const windows = windowManager.getWindows();

    for (const win of windows) {
        const logFilePath = 'logs.txt'; // Đường dẫn file log
        
        // Lấy tiêu đề và ghi log vào file
        const logMessage = win.getTitle().toLowerCase();
        console.log(logMessage);
        
        // Ghi log vào file
        fs.appendFileSync(logFilePath, logMessage + '\n', 'utf8');
    }
}

async function findImagePos(image_path){
    try {
        const image = imageResource(image_path);
        const pos = await screen.find(image);

        // return center position
        pos.left = pos.left + pos.width / 2;
        pos.top = pos.top + pos.height / 2;
        return pos;
    } catch (error) {
        console.log(chalk.red(`Error on findImagePos: ${error}`));
        return null;
    }

}

async function pressAndRelease(...keys) {
    try {
        for (const key of keys) {
            await keyboard.pressKey(key);
        }

        for (const key of keys) {
            await keyboard.releaseKey(key);
        }

        console.log(`Pressed and released keys: ${keys.join(", ")}`);
        await new Promise(resolve => setTimeout(resolve,100));

    } catch (error) {
        console.error("Error pressing and releasing keys:", error);
    }
}

function genLoginScript(username,password){
    let ret = "";
    ret += `const emailInput = document.querySelector('[name="email"]');`;
    ret += `emailInput.value = "${username}";`;
    ret += `await emailInput.dispatchEvent(new Event('input',{ bubbles: true }));`;
    ret += `const password = document.querySelector('[name="password"]');`;
    ret += `password.value = "${password}";`;
    ret += `await password.dispatchEvent(new Event('input',{ bubbles: true }));`;
    ret += `await new Promise(resolve => setTimeout(resolve,10000));`
    ret +=`const buttons = document.querySelectorAll('button');`
    ret += `for (let button of buttons) {if (button.innerHTML.trim() === "Login") {button.click();break;};
}`
    return ret;
}
class AccountManager {
    constructor() {
        this.accounts = [];
        this.proxies = [];
        this.useProxy = false;
        this.enableAutoRetry = false;
        this.connections = {};
        this.messages = [];
        this.userIds = [];
        this.browserIds = [];
        this.accessTokens = [];
    }

    loadAccounts() {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'account.txt'), 'utf8');
            this.accounts = data.split('\n')
                .filter(line => line.trim())
                .map(line => line.split(',').slice(0, 2));
        } catch (err) {
            console.error(chalk.red('❌ account.txt not found!'));
            process.exit(1);
        }
    }

    saveAccounts() {
        const content = this.accounts.map(([email, password]) => `${email},${password}`).join('\n');
        fs.writeFileSync(path.join(__dirname, 'account.txt'), content);
        console.log(chalk.green('✅ Accounts saved to account.txt'));
    }

    printBanner() {
        console.log("Hello world");
    }

    loadAccounts(){
        try {
            const data = fs.readFileSync(path.join(__dirname, 'account.txt'), 'utf8');
            this.accounts = data.split('\n')
                .filter(line => line.trim())
                .map(line => line.split(',').slice(0, 2));
        } catch (err) {
            console.error(chalk.red('❌ account.txt not found!'));
            process.exit(1);
        }
    }

    async addAccountsInteractively() {
        this.printBanner();
        console.log(chalk.yellowBright('Interactive Account Setup'));
        console.log(chalk.yellow('Enter account details below. Type "done" when finished.'));

        while (true) {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'email',
                    message: chalk.green(`Enter email for account ${this.accounts.length + 1} (or 'done' to finish):`),
                },
            ]);

            if (answers.email.toLowerCase() === 'done') break;

            const passwordAnswer = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'password',
                    message: chalk.green(`Enter password for account ${this.accounts.length + 1}:`),
                },
            ]);

            this.accounts.push([answers.email, passwordAnswer.password]);
            console.log(chalk.green(`✅ Account ${this.accounts.length} added: ${answers.email}`));
        }

        this.saveAccounts();
    }

    saveAccounts() {
        const content = this.accounts.map(([email, password]) => `${email},${password}`).join('\n');
        fs.writeFileSync(path.join(__dirname, 'account.txt'), content);
        console.log(chalk.green('✅ Accounts saved to account.txt'));
    }

    async run() {
        this.printBanner();
        this.loadAccounts();

        const menu = [
            { name: 'Add Accounts Interactively', value: 'add_accounts' },
            { name: 'Start Automation', value: 'start' },
            { name: 'Exit', value: 'exit' },
        ];

        while (true) {
            const { choice } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: 'Choose an option:',
                    choices: menu,
                },
            ]);

            if (choice === 'add_accounts') {
                await this.addAccountsInteractively();
            } else if (choice === 'start') {
                break;
            } else if (choice === 'exit') {
                console.warn(chalk.yellow('🛑 Exiting...'));
                process.exit(0);
            }
        }

        // loop for all account
        for(const [userName,passWord] of this.accounts) {
            console.log(`Username: ${userName}, Pass: ${passWord}`);
            // await this.processWithSelenium(userName,passWord);
            await this.getAccessToken(userName,passWord);
        };


    }

    async getAccessToken(username,password){
        console.log(chalk.green(`Get access tocken for username = ${username}`));
        let token = null;
        // open Chrome by nut-js
        await mouse.setPosition(new Point(0,0));
        await pressAndRelease(Key.LeftWin,Key.R);
        clipboardy.writeSync(_openChromeCommand);
        await pressAndRelease(Key.LeftControl,Key.V);
        await pressAndRelease(Key.Enter);
        await new Promise(resolve => setTimeout(resolve, 3000));
        moveWindowToTopLeft("teneo dashboard");

        await new Promise(resolve => setTimeout(resolve, 10000));
        await pressAndRelease(Key.LeftControl,Key.LeftShift,Key.I);
        const position = await findImagePosition('test_image.png');
        if (position.found) {
            console.log(`Ảnh tìm thấy tại (x=${position.x}, y=${position.y}), với kích thước (width=${position.width}, height=${position.height})`);
        } else {
            console.log('Không tìm thấy ảnh.');
        }
        // await new Promise(resolve => setTimeout(resolve, 100));
        // let consolePos = await findImagePos("console.PNG");
        // if(consolePos!==null) {
        //     await leftClick(consolePos);
        //     await leftClick(consolePos,150,150);
        // }
        // await keyboard.type(`allow pasting`);
        // await pressAndRelease(Key.Enter);
        // clipboardy.writeSync(genLoginScript(username,password));
        // await pressAndRelease()
        // await pressAndRelease(Key.LeftControl,Key.V);
        // await pressAndRelease(Key.Enter);
    }
    async processWithSelenium(userName,passWord){
        const webdriver = await this.initWebdriver(userName,passWord);
        this.linkWallet(webdriver);
        this.linkwithX(webdriver);
        this.connect2Discord(webdriver);
        this.joinProjectTelegram(webdriver);
    }

    parseProxy(proxy) {
        if (!proxy) return null;
        const parsed = new URL(proxy);
        return {
            protocol: parsed.protocol.replace(':', ''),
            host: parsed.hostname,
            port: parseInt(parsed.port, 10),
        };
    }


    async initWebdriver(userName,passWord) {
        console.log(`🔍 [initWebdriver] Initializing webdriver with username: ${userName}`);
        // Simulate webdriver initialization
        try {
            const options = new Chrome.Options();
            const webdriver = new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();

            await webdriver.get('https://dashboard.teneo.pro/dashboard');

            // Waiting for input with attribute (name="email") and set value = userName
            const emailInput = await webdriver.wait(
                until.elementLocated(By.name("email")),
                15000 // Wait for a maximum of 15 seconds
            );
            await emailInput.sendKeys(userName);
            console.log(`✅ [initWebdriver] Email input set to: ${userName}`);

            // Waiting for input with attribute (name="password") and set value = passWord
            const passwordInput = await webdriver.wait(
                until.elementLocated(By.name("password")),
                15000 // Wait for a maximum of 15 seconds
            );
            await passwordInput.sendKeys(passWord);
            console.log(`✅ [initWebdriver] Password input set to: ${passWord}`);

            // Waiting for element with attribute (class="success-circle") for maximum 15 seconds
            await webdriver.wait(
                until.elementLocated(By.className("success-circle")),
                15000 // Wait for a maximum of 15 seconds
            );
            console.log(`✅ [initWebdriver] Success circle element found.`);

            const loginButton = await webdriver.wait(
                until.elementLocated(By.xpath("//button[text()='Login']")),
                15000 // Wait for a maximum of 15 seconds
            );
            await loginButton.click();
            console.log(`✅ [initWebdriver] Login button clicked.`);

            await new Promise(resolve => setTimeout(resolve,10000));
        } catch (error) {
            console.error(`❌ [initWebdriver] Error during webdriver initialization: ${error.message}`);
            throw error;
        }
        return webdriver;
    }

    linkWallet(webdriver) {
        console.log(`🔍 [linkWallet] Linking with smart wallet using webdriver: ${JSON.stringify(webdriver)}`);
        // Simulate linking with X logic
        console.log(`✅ [linkWallet] Linked with smart wallet successfully.`);
    }

    linkwithX(webdriver) {
        console.log(`🔍 [linkwithX] Linking with X using webdriver: ${JSON.stringify(webdriver)}`);
        // Simulate linking with X logic
        console.log(`✅ [linkwithX] Linked with X successfully.`);
    }

    connect2Discord(webdriver) {
        console.log(`🔍 [connect2Discord] Connecting to Discord using webdriver: ${JSON.stringify(webdriver)}`);
        // Simulate Discord connection logic
        console.log(`✅ [connect2Discord] Connected to Discord successfully.`);
    }

    joinProjectTelegram(webdriver) {
        console.log(`🔍 [joinProjectTelegram] join Project Telegram using webdriver: ${JSON.stringify(webdriver)}`);
        // Simulate Discord connection logic
        console.log(`✅ [joinProjectTelegram] Connected to Discord successfully.`);
    }

}

(async () => {
    const manager = new AccountManager();
    try {
        await manager.run();
    } catch (error) {
        console.error(chalk.red(`❌ Fatal error: ${error.message}`));
    }
})();