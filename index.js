const fs = require('fs');
const path = require('path');
const axios = require('axios');


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
        this.accounts.forEach(([userName,passWord]) => {
            console.log(`Username: ${userName}, Pass: ${passWord}`);
        });
        
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