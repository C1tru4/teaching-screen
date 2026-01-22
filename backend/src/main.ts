// 功能：后端应用入口与全局中间件配置。
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded, Request, Response } from 'express';
import express from 'express';
import { join } from 'path';
import { DataManager } from './utils/dataManager';
import * as os from 'os';

// 获取本机IP地址
function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  process.env.TZ = 'Asia/Shanghai';

  // 初始化数据管理器
  const dataManager = DataManager.getInstance();
  
  try {
    // 初始化数据目录
    await dataManager.initializeDirectories();
    
    // 数据迁移功能已移除，数据已手动迁移
  } catch (error) {
    console.error('数据目录初始化失败:', error);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // 支持Web部署的跨域 - 生产环境允许所有来源
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    app.enableCors({ 
      origin: true, // 生产环境允许所有来源
      credentials: true 
    });
  } else {
    // 开发环境也允许所有来源，支持局域网访问
    app.enableCors({ 
      origin: true, // 允许所有来源
      credentials: true 
    });
  }

  // 添加URL解码中间件以支持中文路径
  app.use('/uploads', (req: any, res: any, next: any) => {
    try {
      // 解码URL中的中文字符，处理多重编码
      let decodedUrl = req.url;
      let decodeCount = 0;
      const maxDecodes = 5;
      
      while (decodedUrl.includes('%') && decodeCount < maxDecodes) {
        const newDecodedUrl = decodeURIComponent(decodedUrl);
        if (newDecodedUrl === decodedUrl) break; // 避免无限循环
        decodedUrl = newDecodedUrl;
        decodeCount++;
      }
      
      req.url = decodedUrl;
      console.log('URL解码:', req.url, '->', decodedUrl, `(解码${decodeCount}次)`);
    } catch (error) {
      console.warn('URL解码失败:', req.url, error);
    }
    next();
  });

  // 静态文件：uploads（使用数据管理器）
  const uploadsDir = dataManager.getUploadsPath();
  console.log('静态文件目录:', uploadsDir);
  
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, path) => {
      console.log('静态文件请求:', path);
      // 设置正确的Content-Type和编码
      if (path.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        const filename = path.split('/').pop() || 'document.pdf';
        res.setHeader('Content-Disposition', 'inline; filename*=UTF-8\'\'' + encodeURIComponent(filename));
        console.log('PDF文件响应头已设置:', filename);
      } else if (path.endsWith('.doc')) {
        res.setHeader('Content-Type', 'application/msword');
      } else if (path.endsWith('.docx')) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
      // 设置UTF-8编码以支持中文文件名
      res.setHeader('Content-Disposition', 'inline');
      // 添加缓存控制头
      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
    // 启用dotfiles和index选项
    dotfiles: 'ignore',
    index: false,
    // 自定义文件查找逻辑以支持中文路径
    fallthrough: true
  }));

  // 单端口方案：由后端同时服务管理端与大屏静态资源
  const backendCwd = process.cwd(); // 开发：.../backend  生产：.../resources/app/backend
  const adminDist = join(backendCwd, '..', 'admin-frontend', 'dist');
  const screenDist = join(backendCwd, '..', 'big-screen-frontend', 'dist');

  const expressApp = app.getHttpAdapter().getInstance();

  // 处理 favicon.ico 请求（避免 404 错误）
  expressApp.get('/favicon.ico', (req: Request, res: Response) => {
    res.status(204).end(); // 204 No Content，表示成功但没有内容返回
  });

  // 健康检查端点（在全局前缀之前）
  expressApp.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 用户指南API
  expressApp.get('/api/user-guide', (req: Request, res: Response) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 只读取教学屏幕应用使用说明.md
      // 尝试多个可能的路径
      const possiblePaths = [
        path.join(process.cwd(), '..', '教学屏幕应用使用说明.md'), // 如果从backend目录启动
        path.join(process.cwd(), '教学屏幕应用使用说明.md'), // 如果从根目录启动
        path.join(__dirname, '..', '..', '教学屏幕应用使用说明.md') // 基于编译后的文件位置
      ];
      
      for (const userGuidePath of possiblePaths) {
        if (fs.existsSync(userGuidePath)) {
          const content = fs.readFileSync(userGuidePath, 'utf8');
          console.log('找到用户指南文件:', userGuidePath);
          res.json({ content, source: '教学屏幕应用使用说明.md' });
          return;
        }
      }
      
      // 如果文件不存在，返回错误信息
      res.status(404).json({ 
        error: '用户指南文件未找到',
        message: '请确保 教学屏幕应用使用说明.md 文件存在于项目根目录'
      });
    } catch (error) {
      console.error('读取用户指南失败:', error);
      res.status(500).json({ error: '读取用户指南失败' });
    }
  });

  // 管理端
  expressApp.use('/admin', express.static(adminDist, { index: 'index.html' }));
  expressApp.get('/admin/*', (req: Request, res: Response) => {
    res.sendFile(join(adminDist, 'index.html'));
  });

  // 大屏
  expressApp.use('/screen', express.static(screenDist, { index: 'index.html' }));
  expressApp.get('/screen/*', (req: Request, res: Response) => {
    res.sendFile(join(screenDist, 'index.html'));
  });

  app.setGlobalPrefix('api');

  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  
  const localIp = getLocalIpAddress();
  const dataDir = join(process.cwd(), 'data');
  
  console.log(`[backend] listening on http://0.0.0.0:${port}/api`);
  console.log(`[admin] 管理端: http://localhost:${port}/admin`);
  console.log(`[screen] 大屏端: http://localhost:${port}/screen`);
  console.log(`========================================`);
  console.log(`[info] 服务器已绑定到所有网络接口 (0.0.0.0:${port})`);
  console.log(`[info] 局域网设备可通过本机IP地址访问`);
  console.log(`[info] 本机管理端: http://localhost:${port}/admin`);
  console.log(`[info] 本机大屏端: http://localhost:${port}/screen`);
  console.log(`[info] 局域网管理端: http://${localIp}:${port}/admin`);
  console.log(`[info] 局域网大屏端: http://${localIp}:${port}/screen`);
  console.log(`[info] 数据目录: ${dataDir}`);
  console.log(`========================================`);
}
bootstrap();
