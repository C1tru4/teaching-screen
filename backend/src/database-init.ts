import { DataSource } from 'typeorm';
import { LabEntity } from './entities/lab.entity';
import { ProjectEntity } from './entities/project.entity';
import { SessionEntity } from './entities/session.entity';
import { BannerEntity } from './entities/banner.entity';
import { ConfigKVEntity } from './entities/config-kv.entity';
import { CalendarOverrideEntity } from './entities/calendar-override.entity';

/**
 * 数据库初始化工具
 * 用于便携版安全地创建数据库表结构
 */
export class DatabaseInitializer {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'sqlite',
      database: './data/app.db',
      entities: [
        LabEntity,
        ProjectEntity,
        SessionEntity,
        BannerEntity,
        ConfigKVEntity,
        CalendarOverrideEntity,
      ],
      synchronize: false, // 手动控制同步
      logging: false,
    });
  }

  /**
   * 检查数据库是否需要初始化
   */
  async needsInitialization(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      
      // 检查 labs 表是否存在
      const result = await this.dataSource.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='labs'"
      );
      
      return result.length === 0;
    } catch (error) {
      console.log('数据库检查失败，需要初始化:', (error as Error).message);
      return true;
    }
  }

  /**
   * 安全地初始化数据库
   */
  async initialize(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      console.log('开始初始化数据库表结构...');
      
      // 创建所有表
      await this.dataSource.synchronize();
      
      console.log('✓ 数据库表结构创建完成');
      
      // 插入初始数据
      await this.insertInitialData();
      
      console.log('✓ 初始数据插入完成');
      
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 插入初始数据
   */
  private async insertInitialData(): Promise<void> {
    const labRepo = this.dataSource.getRepository(LabEntity);
    
    // 检查是否已有实验室数据
    const existingLabs = await labRepo.count();
    if (existingLabs === 0) {
      // 插入默认实验室
      const defaultLab = labRepo.create({
        id: 1,
        name: '默认实验室',
        capacity: 30,
      });
      
      await labRepo.save(defaultLab);
      console.log('✓ 默认实验室已创建');
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}

/**
 * 独立的数据库初始化函数
 * 用于便携版启动时调用
 */
export async function initializeDatabase(): Promise<boolean> {
  const initializer = new DatabaseInitializer();
  
  try {
    const needsInit = await initializer.needsInitialization();
    
    if (needsInit) {
      console.log('检测到数据库需要初始化...');
      await initializer.initialize();
      return true;
    } else {
      console.log('数据库已存在，跳过初始化');
      return false;
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return false;
  } finally {
    await initializer.close();
  }
}
