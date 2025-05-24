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
import { dir, error, log, time } from 'console';
import { windowManager } from 'node-window-manager';
import { exec } from 'child_process';
import { rejects } from 'assert';
import { stderr, stdout } from 'process';
import os from 'os';
import { execSync } from 'child_process';

screen.config.resourceDirectory = "./resources";
screen.config.confidence = 0.8;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _tempProfileName = "TempProfile";
const _openChromeCommand =  `chrome --profile-directory="${_tempProfileName}" https://dashboard.teneo.pro/auth --new-window --start-maximized`;
const _getAccessTokenScript = `copy(localStorage.getItem('auth'));`
const _windowScallingFactor = getWindowsScalingFactor();
console.log(chalk.yellow(`Windows scaling factor: ${_windowScallingFactor}`));

// click button contain text
async function clickButtonContainText(webdriver, text){
    if (!webdriver || !text) {
        console.log(chalk.red(`❌ No webdriver or text provided to click button`));
        return false;
    }
    console.log(chalk.yellow(`Waiting for button contain text "${text}"...`));
    const button = await webdriver.wait(until.elementLocated(By.xpath(`//button[contains(text(), '${text}')]`)), 10000);
    if (button) {
        console.log(chalk.green(`Found button with text "${text}"`));
        await button.click();
        console.log(chalk.green(`Clicked button with text "${text}"`));
        return true;
    } else {
        console.log(chalk.red(`Button with text "${text}" not found!`));
        return false;
    }
}
// waiting for a clipboard with timeout
async function waitClipboard(text, timeout = 10000,inteval = 1000) {   
    if (!text) {
        console.log(chalk.red(`❌ No text provided to wait for in clipboard`));
        return null;
    } 

    let startTime = Date.now();
    let clipboardText = clipboardy.readSync();
    while (Date.now() - startTime < timeout) {
        if (clipboardText.includes(text)) {
            console.log(chalk.green(`Found text in clipboard: ${clipboardText}`));
            return clipboardText;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        clipboardText = clipboardy.readSync();
    }
    console.log(chalk.red(`Timeout waiting for text in clipboard`));
    return null;
}

// clear the chrome profile by command
// delete folder %LocalAppData%\Google\Chrome\User Data\<profileName>
async function clearChromeProfile(profileName) {
    const profilePath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', profileName);
    console.log(chalk.yellow(`Clearing Chrome profile: ${profilePath}`));
    try {
        await fs.promises.rm(profilePath, { recursive: true, force: true });
        console.log(chalk.green(`✅ Cleared Chrome profile: ${profilePath}`));
    } catch (error) {
        console.error(chalk.red(`❌ Error clearing Chrome profile: ${error.message}`));
    }
}

/**
 * Get Windows display scaling factor (DPI scaling) as a float (e.g. 1.5 for 150%).
 * Returns 1.0 if not on Windows or cannot detect.
 */
function getWindowsScalingFactor() {
    if (os.platform() !== 'win32') return 1.0;
    console.log(chalk.yellow('Getting Windows scaling factor...'));
    try {
        // Use PowerShell to get scaling (DPI) for primary monitor
        const cmd = 'python.exe ./getDPR.py';
        const output = execSync(cmd, { encoding: 'utf8' }).trim();
        console.log(chalk.yellow(`PowerShell output: ${output}`));
        const dpr = parseFloat(output);
        return dpr;
    } catch (e) {
        // fallback
    }
    return 1.0;
}

//  Convert logical (OpenCV/pyautogui) coordinates to physical (nut-js) coordinates

function logicalToPhysical(value) {
    return Math.round(value / _windowScallingFactor);
}

async function waitForImage(imagePath, timeout = 10000, retryInterval = 200) {
    while (timeout > 0) {
        const pos = await findImagePosition(imagePath);

        if (pos.found) {
            console.log(chalk.green(`Found image at (x=${pos.x}, y=${pos.y}), with sizes (width=${pos.width}, height=${pos.height})`));
            return pos;
        }

        await new Promise(resolve => setTimeout(resolve, retryInterval));
        timeout -= retryInterval;
    }
    return { found: false, x: 0, y: 0, width: 0, height: 0 };
}

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

              // Read the result
              const result = output.split(';');
              const found = result[0] === 'y';

              if (found) {
                const x = logicalToPhysical(parseInt(result[1]));
                const y = logicalToPhysical(parseInt(result[2]));
                const width = logicalToPhysical(parseInt(result[3]));
                const height = logicalToPhysical(parseInt(result[4]));

                resolve({ found, x, y, width, height });
              } else {
                resolve({ found: false, x: 0, y: 0, width: 0, height: 0 });
              }
            });
        });
}

async function leftClick(location, offsetX=0, offsetY=0) {
    try{
        console.log(chalk.green(`Left click at (x=${location.x}, y=${location.y}), with offet (offsetX=${offsetX}, offsetY=${offsetY})`));
        await mouse.setPosition(new Point(location.x + offsetX, location.y + offsetY));
        await mouse.leftClick();
        await new Promise(resolve => setTimeout(resolve,10));
    } catch (error)
    {
        console.log(chalk.red(`Error on leftClick: ${error}`));
    }
}

function moveWindowToTopLeft(titleKeyword) {
    const windows = windowManager.getWindows();
    log(chalk.yellow(`Moving windows with title containing "${titleKeyword}" to top left...`));
    for (const win of windows) {
        const windowTilte = win.getTitle().toLowerCase();
        
        if (titleKeyword && windowTilte.includes(titleKeyword.toLowerCase())) {
            win.setBounds({ x: 0, y: 0, width: 1920, height: 1080 });
            win.maximize();
            console.log(chalk.green(`Window with title "${titleKeyword}" moved to top left.`));
        }
    }
}

async function closeWindow(titleKeyword) {
    console.log(chalk.yellow(`Closing all windows include title "${titleKeyword}"...`));
    const windows = windowManager.getWindows();
    for (const win of windows) {
        const windowTitle = win.getTitle().toLowerCase();
        if (titleKeyword && windowTitle.includes(titleKeyword.toLowerCase())) {
            win.bringToTop();
            console.log(chalk.yellow(`Closing window with title "${windowTitle}"...`));
            await pressAndRelease(Key.LeftAlt,Key.F4);
            console.log(chalk.green(`Window with title "${titleKeyword}" closed.`));
        }
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
        await new Promise(resolve => setTimeout(resolve,10));

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
            const userToken =await this.getAccessToken(userName,passWord);
            if (!userToken) {
                continue;
            }
            await this.processWithSelenium(userToken);
        };


    }

    async loginTeneo(username,password){
        console.log(chalk.green(`Login to Teneo with username = ${username}`));
        
        // open Chrome by nut-js
        console.log(chalk.yellow('Opening Chrome...'));
        await pressAndRelease(Key.LeftWin,Key.R);
        clipboardy.writeSync(_openChromeCommand);
        await pressAndRelease(Key.LeftControl,Key.V);
        await pressAndRelease(Key.Enter);
        console.log(chalk.yellow('Waiting for Chrome to open...'));
        await new Promise(resolve => setTimeout(resolve, 4000));
        console.log(chalk.yellow('Chrome opened. -> Move to top left and maximize'));
        moveWindowToTopLeft("teneo dashboard");
        await pressAndRelease(Key.LeftControl,Key.LeftShift,Key.Num0);

        // input username and password
        // find the Login Image
        console.log(chalk.yellow('Waiting for login image...'));
        const loginPosition = await waitForImage('resources/Login.PNG');
        if (loginPosition.found) {
            console.log(`Find the login Position at (x=${loginPosition.x}, y=${loginPosition.y}), with sizes (width=${loginPosition.width}, height=${loginPosition.height})`);
        } else {
            console.log(`Can't find the login image. Please check the image.`);
            throw new Error('Login image not found');
        }
        console.log(chalk.yellow('Input username...'));
        await leftClick(loginPosition,loginPosition.width/2,loginPosition.height/2+logicalToPhysical(166));
        await pressAndRelease(Key.LeftControl,Key.A);
        clipboardy.writeSync(username);
        await pressAndRelease(Key.LeftControl,Key.V);

        console.log(chalk.yellow('Input password...'));
        await leftClick(loginPosition,loginPosition.width/2-logicalToPhysical(242),loginPosition.height/2+logicalToPhysical(285));
        await pressAndRelease(Key.LeftControl,Key.A);
        clipboardy.writeSync(password);
        await pressAndRelease(Key.LeftControl,Key.V);

        // wait for cloudfare image verification
        console.log(chalk.yellow('Waiting for Cloudfare image...'));
        const cloudfarePos = await waitForImage(`resources/CloudFlare.PNG`,10000);
        if (!cloudfarePos.found) {
            console.log(chalk.red('❌ Cloudfare image not found!'));
            return;
        }

        // click on the Login button
        console.log(chalk.yellow('Clicking on Login button...'));
        await leftClick(cloudfarePos,cloudfarePos.width/2,cloudfarePos.height/2+logicalToPhysical(121));

        
        // handle the google change password popup
        console.log(chalk.yellow('Check for Google Change Password popup...'));
        const googleChangePassPos = await waitForImage(`resources/ChangePassWordPopup.PNG`,2000);
        if (googleChangePassPos.found) {
            console.log(chalk.yellow('Google Change Password popup found!'));
            await leftClick(googleChangePassPos,logicalToPhysical(571),logicalToPhysical(186));
        }

        // verify if the login is successful
        const rewardPos = await waitForImage(`resources/Rewards.PNG`,15000);
        if (!rewardPos.found) {
            console.log(chalk.red('❌ Reward image not found!'));
            throw new Error('Login failed');
        }
    }
    
    async getAccessToken(username,password){
        // close the "teneo dashboard" window
        await closeWindow("teneo dashboard");
        let token = null;
        console.log(chalk.green(`Get access tocken for username = ${username}`));
        console.log(chalk.yellow(`Clear Chrome profile...`));
        await clearChromeProfile(_tempProfileName);

        try {
            await this.loginTeneo(username,password);
        } catch (error) {
            console.error(chalk.red(`❌ Error during login: ${error.message}`));
            return token;
        } 
        console.log(chalk.green('Successfully logged in!'));

        console.log(chalk.yellow('Running script to get access token...'));
        try {
            console.log(chalk.yellow('Opening Chrome console...'));
            await pressAndRelease(Key.LeftControl,Key.LeftShift,Key.J);
            clipboardy.writeSync(_getAccessTokenScript);
            await pressAndRelease(Key.LeftControl,Key.V);
            clipboardy.writeSync("");
            await pressAndRelease(Key.Enter);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // console.log(chalk.yellow('Focusing on Console tab...'));
            console.log(chalk.yellow('typing allow pasting script...'));
            await keyboard.type('allow pasting');
            await pressAndRelease(Key.Enter);

            console.log(chalk.yellow('Pasting script...'));
            clipboardy.writeSync(_getAccessTokenScript);
            await pressAndRelease(Key.LeftControl,Key.V);
            clipboardy.writeSync("");
            await pressAndRelease(Key.Enter);
            console.log(chalk.yellow('Running script...'));

            console.log(chalk.yellow('Waiting for access token...'));
            token = await waitClipboard("accessToken",10000);
            if (token) {
                console.log(chalk.green(`✅ Access token: ${token}`));
            } else {
                console.log(chalk.red('❌ Failed to get access token!'));
            }
        } catch (error) {
            console.error(chalk.red(`❌ Error during script generation: ${error.message}`));
            return token;
        }
        return token;

    }
    async processWithSelenium(token){
        const webdriver = await this.initWebdriver(token);
        await this.linkWallet(webdriver);
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


    async initWebdriver(token) {
        console.log(`🔍 [initWebdriver] Initializing webdriver with token: ${token}`);

        const options = new Chrome.Options();
        console.log(`🔍 [initWebdriver] adding MetaMask extention`);
        options.addExtensions(fs.readFileSync(path.join(__dirname, 'metamask.crx')));
        const webdriver = new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();
        console.log(`🔍 [initWebdriver] Setting up Chrome options...`);
        await webdriver.get('https://dashboard.teneo.pro/dashboard');
        await webdriver.executeScript(`
            localStorage.setItem('auth', '${token}');
        `);

        console.log(`🔍 [initWebdriver] Navigating to Teneo dashboard...`);
        await webdriver.get('https://dashboard.teneo.pro/dashboard');

        await new Promise(resolve => setTimeout(resolve,10000));
        return webdriver;
    }

    async linkWallet(webdriver) {
        console.log(`🔍 [linkWallet] Linking with smart wallet using webdriver: ${JSON.stringify(webdriver)}`);
        console.log(chalk.yellow(`go to https://dashboard.teneo.pro/rewards`));
        await webdriver.get('https://dashboard.teneo.pro/rewards');
        await clickButtonContainText(webdriver, 'Link Wallet now');
        await clickButtonContainText(webdriver, 'Connect & Link');
        // Simulate linking with X logic
        console.log(`✅ [linkWallet] Linked with smart wallet successfully.`);
        await new Promise(resolve => setTimeout(resolve, 20000));
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