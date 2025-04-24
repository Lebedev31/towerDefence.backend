"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const http_exception_filter_1 = require("./exceptions/http-exception.filter");
const cookieParser = require("cookie-parser");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get((config_1.ConfigService));
    const frontendUrl = configService.get('FRONTEND_URL');
    app.enableCors({
        origin: [frontendUrl],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.use(cookieParser());
    const port = configService.get('PORT');
    await app.listen(port ?? 5000);
}
bootstrap();
//# sourceMappingURL=main.js.map