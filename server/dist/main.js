"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    app.enableCors({
        origin: frontendUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server is running on port ${port}`);
        console.log(`📡 WebSocket Gateway ready`);
        console.log(`✅ CORS enabled for: ${frontendUrl}`);
    });
}
bootstrap();
//# sourceMappingURL=main.js.map