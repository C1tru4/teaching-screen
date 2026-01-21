import path from 'path';
import fs from 'fs-extra';
import os from 'os';

/**
 * 数据目录管理工具类
 * 负责管理应用的外部数据存储目录
 */
export class DataManager {
  private static instance: DataManager;
  private userDataPath: string;
  private dataPath: string;
  private uploadsPath: string;
  private logsPath: string;
  private configPath: string;

  private constructor() {
    // 获取用户数据目录（开发环境使用项目目录，生产环境使用用户目录）
    if (process.env.NODE_ENV === 'production') {
      // 生产环境：使用用户目录
      this.userDataPath = path.join(os.homedir(), 'TeachingScreen');
    } else {
      // 开发环境：使用项目目录
      this.userDataPath = process.cwd();
    }
    
    this.dataPath = path.join(this.userDataPath, 'data');
    this.uploadsPath = path.join(this.dataPath, 'uploads');
    this.logsPath = path.join(this.userDataPath, 'logs');
    this.configPath = path.join(this.userDataPath, 'config');
    
    console.log('DataManager 初始化:');
    console.log('  userDataPath:', this.userDataPath);
    console.log('  dataPath:', this.dataPath);
    console.log('  uploadsPath:', this.uploadsPath);
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * 获取用户数据根目录
   */
  public getUserDataPath(): string {
    return this.userDataPath;
  }

  /**
   * 获取应用数据目录
   */
  public getDataPath(): string {
    return this.dataPath;
  }

  /**
   * 获取上传文件目录
   */
  public getUploadsPath(): string {
    return this.uploadsPath;
  }

  /**
   * 获取日志目录
   */
  public getLogsPath(): string {
    return this.logsPath;
  }

  /**
   * 获取配置目录
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 获取数据库文件路径
   */
  public getDatabasePath(): string {
    return path.join(this.dataPath, 'app.db');
  }

  /**
   * 获取项目上传目录
   */
  public getProjectsUploadPath(): string {
    return path.join(this.uploadsPath, 'projects');
  }

  /**
   * 获取横幅上传目录
   */
  public getBannersUploadPath(): string {
    return path.join(this.uploadsPath, 'banners');
  }

  /**
   * 初始化所有必要的目录
   */
  public async initializeDirectories(): Promise<void> {
    try {
      // 确保所有目录存在
      await fs.ensureDir(this.dataPath);
      await fs.ensureDir(this.uploadsPath);
      await fs.ensureDir(this.logsPath);
      await fs.ensureDir(this.configPath);
      await fs.ensureDir(this.getProjectsUploadPath());
      await fs.ensureDir(this.getBannersUploadPath());

      console.log('数据目录初始化完成');
    } catch (error) {
      console.error('初始化数据目录失败:', error);
      throw error;
    }
  }



  /**
   * 物理删除上传文件内容，但保留目录结构
   */
  public async clearUploadsContent(): Promise<void> {
    try {
      console.log('开始清理上传文件内容...');
      
      // 清理项目文件
      const projectsPath = this.getProjectsUploadPath();
      if (await fs.pathExists(projectsPath)) {
        await fs.emptyDir(projectsPath);
        console.log('项目文件已清空:', projectsPath);
      }
      
      // 清理横幅文件
      const bannersPath = this.getBannersUploadPath();
      if (await fs.pathExists(bannersPath)) {
        await fs.emptyDir(bannersPath);
        console.log('横幅文件已清空:', bannersPath);
      }
      
      console.log('上传文件内容清理完成');
    } catch (error) {
      console.error('清理上传文件内容失败:', error);
      throw error;
    }
  }

  /**
   * 删除单个项目的上传文件目录
   */
  public async deleteProjectFiles(year: number, title: string): Promise<void> {
    try {
      const projectsPath = this.getProjectsUploadPath();
      const projectDir = path.join(projectsPath, String(year), title);
      console.log('删除项目 - projectsPath:', projectsPath);
      console.log('删除项目 - year:', year);
      console.log('删除项目 - title:', title);
      console.log('删除项目 - 准备删除项目目录:', projectDir);
      
      if (await fs.pathExists(projectDir)) {
        await fs.remove(projectDir);
        console.log('项目目录已删除:', projectDir);
      } else {
        console.log('项目目录不存在，无需删除:', projectDir);
      }
    } catch (error) {
      console.error('删除项目目录失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据目录信息
   */
  public getDataInfo(): {
    userDataPath: string;
    dataPath: string;
    uploadsPath: string;
    logsPath: string;
    configPath: string;
    databasePath: string;
  } {
    try {
      return {
        userDataPath: this.userDataPath,
        dataPath: this.dataPath,
        uploadsPath: this.uploadsPath,
        logsPath: this.logsPath,
        configPath: this.configPath,
        databasePath: this.getDatabasePath()
      };
    } catch (error) {
      console.error('获取数据信息时出错:', error);
      throw error;
    }
  }
}


