import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const ENV = process.env.NODE_ENV || "DEVELOPMENT";

console.log("ENV", ENV);

const DB_CONFIG = {
    PRODUCTION: {
        username: process.env.PRODUCTION_DB_USER,
        password: process.env.PRODUCTION_DB_PASSWORD,
        database: process.env.PRODUCTION_DB_NAME,
        port: process.env.PRODUCTION_DB_PORT,
        host: process.env.PRODUCTION_DB_HOST,
        dialect: "mysql",
    },
    DEVELOPMENT: {
        username: process.env.DEVELOPMENT_DB_USER,
        password: process.env.DEVELOPMENT_DB_PASSWORD,
        database: process.env.DEVELOPMENT_DB_NAME,
        port: process.env.DEVELOPMENT_DB_PORT,
        host: process.env.DEVELOPMENT_DB_HOST,
        dialect: "mysql",
    },
}

console.log("DB_CONFIG", DB_CONFIG);

const sequelize = new Sequelize(DB_CONFIG[ENV].database, DB_CONFIG[ENV].username, DB_CONFIG[ENV].password, {
    dialect: "mysql",
    host: DB_CONFIG[ENV].host,
    port: DB_CONFIG[ENV].port,
    database: DB_CONFIG[ENV].database,
    username: DB_CONFIG[ENV].username,
    password: DB_CONFIG[ENV].password,
    logging: ENV === "DEVELOPMENT" ? console.log : false,
    define: {
        timestamps: false,
        freezeTableName: true,
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        connectTimeout: 60000,
        charset: "utf8mb4",
    },
});

const connectionTest = async () => {
    let dbConnected = false;
    try {
        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;

        while(retryCount < maxRetries) {
            try {
                const connectPromise = sequelize.authenticate();
                const timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error("Connection timeout 5 Seconds"));
                    }, 5000);
                });

                await Promise.race([connectPromise, timeoutPromise]);

                console.log('메인 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
                console.log(`연결 정보: ${DB_CONFIG[ENV].host}:${DB_CONFIG[ENV].port}`);
                dbConnected = true;
                break;
            } catch (error) {
                lastError = error;
                retryCount++;
                console.log(`연결 정보: ${DB_CONFIG[ENV].host}:${DB_CONFIG[ENV].port}`);
                console.error(`메인 MySQL 데이터베이스 연결 시도 ${retryCount}/${maxRetries} 실패:`, error.message);

                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        if (!dbConnected) {
            throw new Error(`메인 MySQL 데이터베이스 연결 시도 ${maxRetries}회 실패: ${lastError.message}`);
        }

        return true;
    } catch (error) {
        console.error("Unable to connect to the database:", error.message);
        return false;
    }
}

const checkConnection = async () => {
    try {
        const connectStatus = await sequelize.authenticate()
           .then(() => true)
           .catch(() => false);

        return connectStatus;
    } catch (error) {
        console.error("Unable to connect to the database:", error.message);
        return false;
    }
}

const initConnection = async () => {
    try {
       return await connectionTest();
    } catch (error) {
        console.error("Unable to connect to the database:", error.message);
        return false;
    }
}

const monitorConnection = async () => {
    try {
        return await checkConnection();
    } catch (error) {
        console.error("Unable to connect to the database:", error.message);
        return false;
    }
}

let dbConnectionStatus = false;

const startConnectionMonitor = async () => {
    let lastStatus = dbConnectionStatus;

    const monitorInterval = setInterval(async () => {
        try {
            const status = await checkConnection();
            let statusChanged = false;
            if (status !== lastStatus) {
                statusChanged = true;
                if (status) {
                    console.log("[연결 상태 변경] MySQL 데이터베이스 연결이 복구되었습니다.");
                } else {
                    console.error('[연결 상태 변경] MySQL 데이터베이스 연결이 끊어졌습니다.');
                }
            }
            dbConnectionStatus = status;
            lastStatus = status;

            if(statusChanged) {
                console.log(`[연결 상태 변경] 현재 연결 상태: ${status ? "Connected" : "Disconnected"}`);
            }
        } catch (error) {
            console.error('[연결 모니터링 오류] 데이터베이스 연결 모니터링 중 오류 발생:', error.message);
        }
    }, 5000); 

    return monitorInterval;
}

const syncDatabase = async () => {
    try {
        const connectPromise = sequelize.authenticate();
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("Connection timeout 5 Seconds"));
            }, 5000);
        });
        
        await Promise.race([connectPromise, timeoutPromise]);
        console.log('메인 MySQL 데이터베이스 연결이 성공적으로 설정되었습니다.');
        dbConnectionStatus = true;

        const monitorInterval = startConnectionMonitor();

        return {
            remoteSync: dbConnectionStatus,
            monitorInterval: monitorInterval,
        }
    } catch (error) {
        console.error("Unable to synchronize database:", error.message);
        return {
            remoteSync: false,
            monitorInterval: null,
        }
    }
}


export {
    initConnection,
    monitorConnection,
    sequelize,
    syncDatabase,
}