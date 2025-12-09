/**
 * @author Pablo
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { NodeBDD, DataType } = require('node-bdd');
const nodedatabase = new NodeBDD()
const { ipcRenderer } = require('electron')
const fs = require('fs');

let dev = process.env.NODE_ENV === 'dev';

class database {
    async creatDatabase(tableName, tableConfig) {
        const userDataPath = await ipcRenderer.invoke('path-user-data');
        // En desarrollo: mantener compatibilidad con ubicación anterior (data/)
        // En producción: usar ubicación consistente (userData/databases)
        const dbPath = dev
            ? `${userDataPath}/../..`
            : `${userDataPath}/databases`;

        // Log para debugging (solo en dev)
        if (dev) {
            console.log('[DB] Database path:', dbPath);
            console.log('[DB] Table:', tableName);
        }

        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
        }

        if (!dev) alert(`DEBUG: DB Path: ${dbPath}\nTable: ${tableName}`);

        try {
            return await nodedatabase.intilize({
                databaseName: 'Databases',
                fileType: 'db',
                tableName: tableName,
                path: dbPath,
                tableColumns: tableConfig,
            });
        } catch (e) {
            alert(`ERROR initializing DB ${tableName}: ${e.message}`);
            throw e;
        }
    }

    async getDatabase(tableName) {
        return await this.creatDatabase(tableName, {
            json_data: DataType.TEXT.TEXT,
        });
    }

    async createData(tableName, data) {
        let table = await this.getDatabase(tableName);
        data = await nodedatabase.createData(table, { json_data: JSON.stringify(data) })
        let id = data.id
        data = JSON.parse(data.json_data)
        data.ID = id
        return data
    }

    async readData(tableName, key = 1) {
        let table = await this.getDatabase(tableName);
        let data = await nodedatabase.getDataById(table, key)
        if (data) {
            let id = data.id
            data = JSON.parse(data.json_data)
            data.ID = id
        }
        return data ? data : undefined
    }

    async readAllData(tableName) {
        let table = await this.getDatabase(tableName);
        let data = await nodedatabase.getAllData(table)
        return data.map(info => {
            let id = info.id
            info = JSON.parse(info.json_data)
            info.ID = id
            return info
        })
    }

    async updateData(tableName, data, key = 1) {
        let table = await this.getDatabase(tableName);
        await nodedatabase.updateData(table, { json_data: JSON.stringify(data) }, key)
    }

    async deleteData(tableName, key = 1) {
        let table = await this.getDatabase(tableName);
        await nodedatabase.deleteData(table, key)
    }
}

export default database;