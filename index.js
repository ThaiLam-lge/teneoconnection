import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import inquirer from 'inquirer';

// Tự định nghĩa __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            await this.processWithSelenium(userName,passWord);
        };

    }

    async processWithSelenium(userName,passWord){
        const token = await this.getAccessToken(userName,passWord);
        if(!token) {
            console.warn(chalk.yellow(`can't sign with username = ${userName} and password = ${passWord}`))
            return;
        }
        const webdriver = this.initWebdriver(token);
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

    async getAccessToken(userName, passWord) {
        const url = 'https://auth.teneo.pro/api/login';
        const headers = {
            'Content-Type': 'application/json',
            'Origin': 'https://dashboard.teneo.pro',
            'Referer': 'https://dashboard.teneo.pro/',
            'x-api-key': 'OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjB',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        };
        
        
        console.log("Sending request with:", { userName, passWord });
        try {
            const response = await axios.post(url, { "email":userName, "password":passWord }, {
                headers,
                timeout: 30000
            });

            console.log("Response:", response.data);
            if (response.status === 200) {
                const { user, access_token } = response.data;
                console.log(chalk.green(`✅ Account ${userName} with userID = ${user.id} authenticated`));
                console.log(`✅ [getAccesstocken] Token generated: ${access_token}`);
                return access_token;
            } else {
                throw new Error(`Authentication failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error(chalk.red(`❌ Account ${userName} failed: ${error.message}`));
            return null;
        }
    }

    initWebdriver(token) {
        console.log(`🔍 [initWebdriver] Initializing webdriver with token: ${token}`);
        // Simulate webdriver initialization
        const webdriver = { token };
        console.log(`✅ [initWebdriver] Webdriver initialized.`);
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