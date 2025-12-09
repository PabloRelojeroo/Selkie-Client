/**
 * @author Pablo
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let dev = process.env.NODE_ENV === 'dev';

class database {

    async _getFilePath(tableName) {
        const userDataPath = await ipcRenderer.invoke('path-user-data');
        const dbDir = dev
            ? path.resolve(userDataPath, '../../').replace(/\\/g, '/')
            : path.join(userDataPath, 'databases');

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // DEBUG PATH
        /*
        try {
            const logPath = path.join(dbDir, 'db_debug.log');
            fs.appendFileSync(logPath, `[PATH] ${tableName} -> ${path.join(dbDir, `${tableName}.json`)}\n`);
        } catch(e) {}
        */

        return path.join(dbDir, `${tableName}.json`);
    }

    async _readFile(tableName) {
        const filePath = await this._getFilePath(tableName);

        // DEBUG READ
        try {
            const userDataPath = await ipcRenderer.invoke('path-user-data');
            const dbDir = dev ? path.resolve(userDataPath, '../../').replace(/\\/g, '/') : path.join(userDataPath, 'databases');
            const logPath = path.join(dbDir, 'db_debug.log');

            if (!fs.existsSync(filePath)) {
                fs.appendFileSync(logPath, `[${new Date().toISOString()}] READ ${tableName}: FILE NOT FOUND at ${filePath}\n`);
                return [];
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] READ ${tableName}: Success (${content.length} bytes)\n`);
            return JSON.parse(content) || [];
        } catch (error) {
            console.error(`Error reading database ${tableName}:`, error);
            // Log error
            try {
                const userDataPath = await ipcRenderer.invoke('path-user-data');
                const dbDir = dev ? path.resolve(userDataPath, '../../').replace(/\\/g, '/') : path.join(userDataPath, 'databases');
                const logPath = path.join(dbDir, 'db_debug.log');
                fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR READ ${tableName}: ${error.message}\n`);
            } catch (e) { }
            return [];
        }
    }

    async _writeFile(tableName, data) {
        const filePath = await this._getFilePath(tableName);

        // DEBUG LOGGING
        try {
            const userDataPath = await ipcRenderer.invoke('path-user-data');
            const logPath = path.join(dev ? path.resolve(userDataPath, '../../') : path.join(userDataPath, 'databases'), 'db_debug.log');
            const logEntry = `[${new Date().toISOString()}] WRITE ${tableName}: ${JSON.stringify(data).substring(0, 100)}...\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (e) {
            console.error('Log error', e);
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
    }

    // Mock API for compatibility (previously creatDatabase was used to init node-bdd)
    async creatDatabase(tableName, tableConfig) {
        return tableName;
    }

    async getDatabase(tableName) {
        return tableName;
    }

    async createData(tableName, data) {
        const items = await this._readFile(tableName);

        // Auto-increment ID
        const maxId = items.reduce((max, item) => (item.id > max ? item.id : max), 0);
        const newId = maxId + 1;

        const newItem = {
            id: newId,
            ...data
        };

        items.push(newItem);
        await this._writeFile(tableName, items);

        // Return compliance with previous API (ID capitalized)
        return {
            ...newItem,
            ID: newId
        };
    }

    async readData(tableName, key = 1) {
        const items = await this._readFile(tableName);
        const item = items.find(i => i.id == key);

        if (item) {
            return {
                ...item,
                ID: item.id
            };
        }
        return undefined;
    }

    async readAllData(tableName) {
        const items = await this._readFile(tableName);
        return items.map(item => ({
            ...item,
            ID: item.id
        }));
    }

    async updateData(tableName, data, key = 1) {
        const items = await this._readFile(tableName);
        const index = items.findIndex(i => i.id == key);

        if (index !== -1) {
            // Merge existing data with updates, keeping the ID
            items[index] = {
                ...items[index],
                ...data,
                id: key // Ensure ID doesn't change
            };
            await this._writeFile(tableName, items);
        }
    }

    async deleteData(tableName, key = 1) {
        let items = await this._readFile(tableName);
        items = items.filter(i => i.id != key);
        await this._writeFile(tableName, items);
    }
}

export default database;