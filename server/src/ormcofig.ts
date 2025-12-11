import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { User } from './user/entities/user.entitiey';

const config: PostgresConnectionOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '123456',
  database: 'Code-Editor-user',
  // 直接导入实体类，确保能正确加载
  entities: [User],
  // 作用：自动同步实体与数据库的结构（开发环境使用，生产环境建议关闭）
  synchronize: true,
  // 关闭 SQL 日志，避免在控制台打印 query/COMMIT 等信息
  logging: false,
};

export default config;
