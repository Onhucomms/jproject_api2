import { initConnection, monitorConnection, sequelize, syncDatabase } from "./Model/database.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3001;

let dbMonitorinterval = null;
let serverStartTime = null;

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 보안 미들웨어 설정
app.use(helmet());

// CORS 설정
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// 요청 제한 설정
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX || 100,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
});
app.use(limiter);

// JSON 파싱 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// 기본 라우트
app.get('/', (req, res) => {
    res.json({ 
        message: 'API Server is running',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});



// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        database: dbConnectionStatus ? 'Connected' : 'Disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'DEVELOPMENT' ? err.message : '서버 내부 오류가 발생했습니다.'
  });
});


const startServer = async () => {
    try {
        let isRestart = false;
        
        await initConnection();

        const syncResult = await syncDatabase();

        if(syncResult && syncResult.monitorInterval) {
            dbMonitorinterval = syncResult.monitorInterval;
        }

        // Express 서버 시작
        const server = app.listen(PORT, () => {
            serverStartTime = new Date();
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 API endpoint: http://localhost:${PORT}/`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            if (dbMonitorinterval) {
                clearInterval(dbMonitorinterval);
            }
            server.close(() => {
                
                console.log('Process terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            if (dbMonitorinterval) {
                clearInterval(dbMonitorinterval);
            }
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error("Unable to start server:", error.message);
        process.exit(1);
    }
}

startServer();