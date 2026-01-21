import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors, Res, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs'; import * as fsp from 'fs/promises'; import * as path from 'path';
import { ProjectsService } from './projects.service';
import { ProjectEntity } from './entities/project.entity';
import { ConfigService } from './config.service';
import { NotFoundException } from '@nestjs/common';
import { DataManager } from './utils/dataManager';
function toPosix(p: string) { return p.replace(/\\/g, '/'); }
function ensureDirSync(dir: string) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService, private readonly cfg: ConfigService) {}

  @Get() list(@Query('year') yearParam?: string) {
    const year = yearParam ? Number(yearParam) : undefined;
    return this.svc.listByYearSorted(year);
  }

  @Get(':id/paper')
  async getPaper(@Param('id') idParam: string, @Res() res: any) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!project.paper_url) {
      throw new NotFoundException('该项目没有论文文件')
    }

    try {
      // 直接从数据库URL构建相对路径
      const urlWithoutQuery = project.paper_url.split('?')[0]
      console.log('数据库URL:', urlWithoutQuery)
      
      // 从 /uploads/projects/2024/智能农业监控/论文1.pdf 提取相对路径
      let relativePath: string
      if (urlWithoutQuery.startsWith('/uploads/')) {
        relativePath = urlWithoutQuery.substring('/uploads/'.length)
      } else if (urlWithoutQuery.startsWith('uploads/')) {
        relativePath = urlWithoutQuery.substring('uploads/'.length)
      } else {
        relativePath = urlWithoutQuery
      }
      
      console.log('提取的相对路径:', relativePath)
      
      // 构建完整的相对路径（相对于项目根目录）
      const fullRelativePath = path.join('data', 'uploads', relativePath)
      console.log('完整相对路径:', fullRelativePath)
      
      // 智能查找文件（处理编码问题）
      let actualFilePath: string | undefined
      if (fs.existsSync(fullRelativePath)) {
        actualFilePath = fullRelativePath
      } else {
        // 如果直接路径不存在，尝试通过目录遍历找到文件
        const pathParts = relativePath.split('/')
        const yearDir = pathParts[1] // 2024
        const projectDir = pathParts[2] // 智能农业监控
        const filename = pathParts[3] // 论文1.pdf
        
        const yearPath = path.join('data', 'uploads', 'projects', yearDir)
        console.log('年份目录路径:', yearPath)
        
        if (fs.existsSync(yearPath)) {
          const projectDirs = fs.readdirSync(yearPath)
          console.log('项目目录列表:', projectDirs)
          
          // 直接使用第一个项目目录（处理编码问题）
          const matchedProjectDir = projectDirs[0] // 假设只有一个项目目录
          console.log('使用项目目录:', matchedProjectDir)
          
          if (matchedProjectDir) {
            const projectPath = path.join(yearPath, matchedProjectDir)
            console.log('找到项目目录:', projectPath)
            
            const files = fs.readdirSync(projectPath)
            console.log('项目目录中的文件:', files)
            
            // 查找PDF文件
            const pdfFile = files.find(file => 
              file.endsWith('.pdf') && 
              (file === filename || file.includes('论文') || file.includes('paper'))
            )
            
            if (pdfFile) {
              actualFilePath = path.join(projectPath, pdfFile)
              console.log('找到PDF文件:', actualFilePath)
            }
          }
        }
      }
      
      if (!actualFilePath || !fs.existsSync(actualFilePath)) {
        console.error('文件不存在:', fullRelativePath)
        throw new NotFoundException('论文文件不存在')
      }

      console.log('最终文件路径:', actualFilePath)

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(project.paper_filename || 'paper.pdf')}`)
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      console.log('发送PDF文件:', actualFilePath)
      console.log('文件大小:', fs.statSync(actualFilePath).size, 'bytes')

      // 发送文件（直接使用相对路径）
      res.sendFile(path.resolve(actualFilePath))
    } catch (error) {
      console.error('获取PDF文件失败:', error)
      throw new NotFoundException('无法获取论文文件')
    }
  }

  @Patch(':id/fix-paper-url')
  async fixPaperUrl(@Param('id') idParam: string) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!project.paper_url) {
      throw new BadRequestException('该项目没有论文文件')
    }

    // 修复多重编码的URL
    let fixedUrl = project.paper_url
    let decodeCount = 0
    const maxDecodes = 5 // 防止无限循环
    
    while (fixedUrl.includes('%') && decodeCount < maxDecodes) {
      const newUrl = decodeURIComponent(fixedUrl)
      if (newUrl === fixedUrl) break // 没有变化，停止解码
      fixedUrl = newUrl
      decodeCount++
    }

    // 确保URL格式正确
    if (!fixedUrl.startsWith('/uploads/')) {
      // 如果URL不完整，尝试构建完整路径
      const filename = project.paper_filename || 'paper.pdf'
      fixedUrl = `/uploads/projects/${project.year}/${project.title}/${filename}`
    }

    // 更新数据库
    await this.svc.update(id, { paper_url: fixedUrl })

    return { 
      message: '论文URL修复成功',
      old_url: project.paper_url,
      new_url: fixedUrl,
      decode_count: decodeCount
    }
  }

  @Post()
  async create(@Body() body: Partial<ProjectEntity> & { students?: any }) {
    if (!body?.title || !body?.mentor || body?.member_count === undefined) {
      throw new BadRequestException('title, mentor, member_count are required');
    }
    const sem = await this.cfg.getSemesterStartMondayISO();
    return await this.svc.create(
      {
        title: body.title as string,
        mentor: body.mentor as string,
        member_count: Number(body.member_count),
        status: body.status as any,
        year: body.year as any,
        excellent: !!body.excellent,
        description: body.description,
        students: body.students as any
      },
      sem
    );
  }

  @Patch(':id') update(@Param('id') idParam: string, @Body() body: any) { return this.svc.update(Number(idParam), body); }

  @Delete(':id')
  async remove(@Param('id') idParam: string, @Query('purgeImages') purgeImages?: string) {
    const id = Number(idParam);
    const project = await this.svc.detail(id);
    if (!project) throw new NotFoundException('项目不存在');
    
    // 删除项目相关的文件
    if (String(purgeImages).toLowerCase() === 'true') {
      try {
        await DataManager.getInstance().deleteProjectFiles(project.year, project.title);
      } catch (error) {
        console.warn('删除项目目录失败:', error);
      }
    }
    
    const removed = await this.svc.remove(id);
    return removed;
  }

  @Post('clear-projects')
  async clearProjects(@Body() body: { year?: number }) {
    const result = await this.svc.removeByYear(body.year);
    return {
      success: true,
      message: `已删除${result.year === 'all' ? '所有年份' : result.year + '年'}的项目数据，共${result.deletedCount}条记录`,
      deletedCount: result.deletedCount
    };
  }

  @Get('years')
  async getYears() {
    const years = await this.svc.getYears();
    return years;
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@Param('id') idParam: string, @UploadedFile() file: Express.Multer.File) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!file) throw new BadRequestException('请选择图片文件')

    // 检查文件类型（同时检查MIME类型和文件扩展名）
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const fileExtension = path.extname(file.originalname).toLowerCase()
    
    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException('只支持 JPG、PNG、GIF、WebP 格式的图片')
    }

    // 检查文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('图片大小不能超过 5MB')
    }

    // 生成文件名：项目标题
    const ext = path.extname(file.originalname)
    const filename = `${project.title}${ext}`

    // 确保目录存在：年份/项目标题/
    const projectDir = path.join(DataManager.getInstance().getProjectsUploadPath(), String(project.year), project.title)
    ensureDirSync(projectDir)

    // 如果项目已有封面图片，先删除旧图片
    if (project.cover_url) {
      const urlWithoutQuery = project.cover_url.split('?')[0]
      console.log('上传图片 - 原始 cover_url:', project.cover_url)
      
      // 直接构建正确的文件路径
      let oldFilePath: string
      if (urlWithoutQuery.startsWith('/uploads/')) {
        const relativePath = urlWithoutQuery.substring('/uploads/'.length)
        oldFilePath = path.join(DataManager.getInstance().getUploadsPath(), relativePath)
      } else if (urlWithoutQuery.startsWith('uploads/')) {
        const relativePath = urlWithoutQuery.substring('uploads/'.length)
        oldFilePath = path.join(DataManager.getInstance().getUploadsPath(), relativePath)
      } else if (urlWithoutQuery.startsWith('projects/')) {
        oldFilePath = path.join(DataManager.getInstance().getUploadsPath(), urlWithoutQuery)
      } else {
        oldFilePath = path.join(DataManager.getInstance().getUploadsPath(), urlWithoutQuery)
      }
      
      console.log('上传图片 - 删除旧文件路径:', oldFilePath)
      
      try {
        await fsp.unlink(oldFilePath)
        console.log(`已删除旧图片文件: ${oldFilePath}`)
      } catch (error) {
        console.warn('删除旧图片文件失败:', error)
      }
    }

    // 保存新文件
    const filePath = path.join(projectDir, filename)
    await fsp.writeFile(filePath, file.buffer)

    // 更新项目的 cover_url（追加时间戳，强制前端刷新缓存）
    const coverUrl = `/uploads/projects/${project.year}/${project.title}/${filename}?v=${Date.now()}`
    await this.svc.update(id, { cover_url: coverUrl })

    return { cover_url: coverUrl }
  }

  @Post(':id/papers')
  @UseInterceptors(FileInterceptor('paper'))
  async uploadPaper(@Param('id') idParam: string, @UploadedFile() file: Express.Multer.File) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!file) throw new BadRequestException('请选择论文文件')

    // 仅允许 PDF
    const isPdfMime = file.mimetype === 'application/pdf'
    const isPdfExt = path.extname(Buffer.from(file.originalname, 'latin1').toString('utf8')).toLowerCase() === '.pdf'
    if (!isPdfMime || !isPdfExt) {
      throw new BadRequestException('仅支持 PDF 格式的论文文件（请先转换为PDF后再上传）')
    }

    // 检查文件大小（20MB）
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('论文文件大小不能超过 20MB')
    }

    // 保持原始文件名（PDF），确保编码正确
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8')

    // 确保目录存在：年份/项目标题/
    const projectDir = path.join(DataManager.getInstance().getProjectsUploadPath(), String(project.year), project.title)
    ensureDirSync(projectDir)

    // 如果项目已有论文文件，先删除旧论文（使用相对路径）
    if (project.paper_url) {
      const urlWithoutQuery = project.paper_url.split('?')[0]
      console.log('上传论文 - 原始 paper_url:', project.paper_url)
      
      // 构建相对路径（不使用绝对路径）
      let relativePath: string
      if (urlWithoutQuery.startsWith('/uploads/')) {
        relativePath = urlWithoutQuery.substring('/uploads/'.length)
      } else if (urlWithoutQuery.startsWith('uploads/')) {
        relativePath = urlWithoutQuery.substring('uploads/'.length)
      } else if (urlWithoutQuery.startsWith('projects/')) {
        relativePath = urlWithoutQuery
      } else {
        relativePath = urlWithoutQuery
      }
      
      // 构建完整的相对路径
      const oldFilePath = path.join('data', 'uploads', relativePath)
      console.log('上传论文 - 删除旧文件相对路径:', oldFilePath)
      
      try {
        if (fs.existsSync(oldFilePath)) {
          await fsp.unlink(oldFilePath)
          console.log(`已删除旧论文文件: ${oldFilePath}`)
        } else {
          console.log('旧论文文件不存在，无需删除:', oldFilePath)
        }
      } catch (error) {
        console.warn('删除旧论文文件失败:', error)
      }
    }

    // 保存新文件
    const filePath = path.join(projectDir, filename)
    await fsp.writeFile(filePath, file.buffer)

    // 验证保存的文件是否有效
    try {
      const savedBuffer = await fsp.readFile(filePath)
      const isValidPdf = savedBuffer.slice(0, 4).toString() === '%PDF'
      
      if (!isValidPdf) {
        // 如果文件无效，删除它
        await fsp.unlink(filePath)
        throw new BadRequestException('上传的PDF文件格式无效，请检查文件是否损坏')
      }
      
      console.log('文件验证成功:')
      console.log('  文件大小:', savedBuffer.length, 'bytes')
      console.log('  PDF头:', savedBuffer.slice(0, 4).toString())
    } catch (error) {
      console.error('文件验证失败:', error)
      throw new BadRequestException('文件保存失败，请重新上传')
    }

    // 更新项目的 paper_url 和 paper_filename（不添加时间戳，使用相对路径）
    const paperUrl = `/uploads/projects/${project.year}/${project.title}/${filename}`
    await this.svc.update(id, { paper_url: paperUrl, paper_filename: filename })

    console.log('论文上传成功:')
    console.log('  新文件路径:', filePath)
    console.log('  新URL:', paperUrl)
    console.log('  文件名:', filename)

    return { paper_url: paperUrl, paper_filename: filename }
  }

  @Delete(':id/papers')
  async deletePaper(@Param('id') idParam: string) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!project.paper_url) {
      throw new BadRequestException('该项目没有论文文件')
    }

    // 删除文件（使用相对路径）
    const urlWithoutQuery = project.paper_url.split('?')[0]
    console.log('删除论文 - 原始 paper_url:', project.paper_url)
    
    // 构建相对路径（不使用绝对路径）
    let relativePath: string
    if (urlWithoutQuery.startsWith('/uploads/')) {
      relativePath = urlWithoutQuery.substring('/uploads/'.length)
    } else if (urlWithoutQuery.startsWith('uploads/')) {
      relativePath = urlWithoutQuery.substring('uploads/'.length)
    } else if (urlWithoutQuery.startsWith('projects/')) {
      relativePath = urlWithoutQuery
    } else {
      relativePath = urlWithoutQuery
    }
    
    // 构建完整的相对路径
    const filePath = path.join('data', 'uploads', relativePath)
    console.log('删除论文 - 相对路径:', filePath)
    
    try {
      await fsp.unlink(filePath)
      console.log(`已删除论文文件: ${filePath}`)
    } catch (error) {
      console.warn('删除论文文件失败:', error)
    }

    // 更新项目信息
    await this.svc.update(id, { paper_url: null, paper_filename: null })

    return { message: '论文删除成功' }
  }

  @Post(':id/videos')
  @UseInterceptors(FileInterceptor('video', {
    storage: memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      fieldSize: 100 * 1024 * 1024, // 100MB
    },
  }))
  async uploadVideo(@Param('id') idParam: string, @UploadedFile() file: Express.Multer.File) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!file) throw new BadRequestException('请选择视频文件')

    // 仅允许视频格式
    const videoMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    const isVideoMime = videoMimeTypes.includes(file.mimetype)
    const videoExt = path.extname(Buffer.from(file.originalname, 'latin1').toString('utf8')).toLowerCase()
    const isVideoExt = ['.mp4', '.webm', '.ogg', '.mov'].includes(videoExt)
    
    if (!isVideoMime && !isVideoExt) {
      throw new BadRequestException('仅支持视频格式文件（MP4、WebM、OGG、MOV）')
    }

    // 检查文件大小（100MB）
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException('视频文件大小不能超过 100MB')
    }

    // 自动命名为：项目名称+演示视频
    const filename = `${project.title}演示视频${videoExt}`
    // 确保文件名不包含特殊字符
    const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_')

    // 确保目录存在：年份/项目标题/
    const projectDir = path.join(DataManager.getInstance().getProjectsUploadPath(), String(project.year), project.title)
    ensureDirSync(projectDir)

    // 如果项目已有视频文件，先删除旧视频（使用相对路径）
    if (project.video_url) {
      const urlWithoutQuery = project.video_url.split('?')[0]
      console.log('上传视频 - 原始 video_url:', project.video_url)
      
      // 构建相对路径（不使用绝对路径）
      let relativePath: string
      if (urlWithoutQuery.startsWith('/uploads/')) {
        relativePath = urlWithoutQuery.substring('/uploads/'.length)
      } else if (urlWithoutQuery.startsWith('uploads/')) {
        relativePath = urlWithoutQuery.substring('uploads/'.length)
      } else if (urlWithoutQuery.startsWith('projects/')) {
        relativePath = urlWithoutQuery
      } else {
        relativePath = urlWithoutQuery
      }
      
      // 构建完整的相对路径
      const oldFilePath = path.join('data', 'uploads', relativePath)
      console.log('上传视频 - 删除旧文件相对路径:', oldFilePath)
      
      try {
        if (fs.existsSync(oldFilePath)) {
          await fsp.unlink(oldFilePath)
          console.log(`已删除旧视频文件: ${oldFilePath}`)
        } else {
          console.log('旧视频文件不存在，无需删除:', oldFilePath)
        }
      } catch (error) {
        console.warn('删除旧视频文件失败:', error)
      }
    }

    // 保存新文件
    const filePath = path.join(projectDir, safeFilename)
    console.log('保存视频文件:')
    console.log('  原始文件大小:', file.size, 'bytes')
    console.log('  原始文件名:', file.originalname)
    console.log('  原始MIME类型:', file.mimetype)
    console.log('  目标路径:', filePath)
    console.log('  Buffer大小:', file.buffer?.length || 0, 'bytes')
    console.log('  Buffer类型:', file.buffer?.constructor?.name || 'unknown')
    
    // 检查 buffer 是否存在且有效
    if (!file.buffer) {
      console.error('错误：file.buffer 不存在')
      throw new BadRequestException('文件数据为空，请重新上传')
    }
    
    if (file.buffer.length === 0) {
      console.error('错误：file.buffer 长度为 0')
      throw new BadRequestException('文件数据为空，请重新上传')
    }
    
    if (file.buffer.length !== file.size) {
      console.warn('警告：Buffer大小与文件大小不匹配')
      console.warn('  Buffer大小:', file.buffer.length, 'bytes')
      console.warn('  文件大小:', file.size, 'bytes')
      console.warn('  差异:', Math.abs(file.buffer.length - file.size), 'bytes')
    }
    
    // 确保使用 Buffer 类型写入
    const bufferToWrite = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer)
    await fsp.writeFile(filePath, bufferToWrite)

    // 验证保存的文件是否有效
    try {
      const savedBuffer = await fsp.readFile(filePath)
      const savedSize = savedBuffer.length
      
      console.log('文件保存验证:')
      console.log('  保存后文件大小:', savedSize, 'bytes')
      console.log('  原始文件大小:', file.size, 'bytes')
      console.log('  大小匹配:', savedSize === file.size ? '✓' : '✗')
      
      if (savedSize !== file.size) {
        console.error('文件大小不匹配！可能文件保存不完整')
        await fsp.unlink(filePath)
        throw new BadRequestException('文件保存失败，文件大小不匹配，请重新上传')
      }
      
      if (savedSize === 0) {
        console.error('保存的文件为空！')
        await fsp.unlink(filePath)
        throw new BadRequestException('文件保存失败，文件为空，请重新上传')
      }
      
      // 检查视频文件头（MP4文件通常以 ftyp 开头）
      const fileHeader = savedBuffer.slice(0, 12).toString('hex')
      console.log('文件头（hex）:', fileHeader)
      
      // MP4文件头检查：ftyp box通常在偏移4-8字节
      const hasValidHeader = savedBuffer.length > 8 && (
        savedBuffer.slice(4, 8).toString() === 'ftyp' ||
        savedBuffer.slice(0, 4).toString().includes('ftyp') ||
        fileHeader.includes('66747970') // 'ftyp' in hex
      )
      
      if (!hasValidHeader && videoExt === '.mp4') {
        console.warn('警告：MP4文件头验证失败，但继续保存（可能是其他视频格式）')
      }
      
      // 尝试检测视频编码格式（通过查找 moov box 中的编码信息）
      try {
        const fileHeaderStr = savedBuffer.slice(0, 100).toString('ascii', 0, 100)
        const hasH264 = fileHeaderStr.includes('avc1') || savedBuffer.includes(Buffer.from('avc1'))
        const hasH265 = fileHeaderStr.includes('hev1') || fileHeaderStr.includes('hvc1') || savedBuffer.includes(Buffer.from('hev1')) || savedBuffer.includes(Buffer.from('hvc1'))
        
        console.log('视频编码检测:')
        console.log('  可能包含 H.264 (AVC):', hasH264 ? '是' : '否')
        console.log('  可能包含 H.265 (HEVC):', hasH265 ? '是' : '否')
        
        if (hasH265 && !hasH264) {
          console.warn('⚠️ 警告：视频可能使用 H.265/HEVC 编码，某些浏览器可能不支持')
          console.warn('⚠️ 建议：重新编码为 H.264 (AVC) 格式以确保浏览器兼容性')
        }
      } catch (err) {
        console.warn('无法检测视频编码格式:', err)
      }
      
      console.log('文件验证成功')
    } catch (error) {
      console.error('文件验证失败:', error)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('文件保存失败，请重新上传')
    }

    // 更新项目的 video_url 和 video_filename（不添加时间戳，使用相对路径）
    const videoUrl = `/uploads/projects/${project.year}/${project.title}/${safeFilename}`
    await this.svc.update(id, { video_url: videoUrl, video_filename: safeFilename })

    console.log('视频上传成功:')
    console.log('  新文件路径:', filePath)
    console.log('  新URL:', videoUrl)
    console.log('  文件名:', safeFilename)

    return { video_url: videoUrl, video_filename: safeFilename }
  }

  @Delete(':id/videos')
  async deleteVideo(@Param('id') idParam: string) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!project.video_url) {
      throw new BadRequestException('该项目没有视频文件')
    }

    // 删除文件（使用相对路径）
    const urlWithoutQuery = project.video_url.split('?')[0]
    console.log('删除视频 - 原始 video_url:', project.video_url)
    
    // 构建相对路径（不使用绝对路径）
    let relativePath: string
    if (urlWithoutQuery.startsWith('/uploads/')) {
      relativePath = urlWithoutQuery.substring('/uploads/'.length)
    } else if (urlWithoutQuery.startsWith('uploads/')) {
      relativePath = urlWithoutQuery.substring('uploads/'.length)
    } else if (urlWithoutQuery.startsWith('projects/')) {
      relativePath = urlWithoutQuery
    } else {
      relativePath = urlWithoutQuery
    }
    
    // 构建完整的相对路径
    const filePath = path.join('data', 'uploads', relativePath)
    console.log('删除视频 - 相对路径:', filePath)
    
    try {
      if (fs.existsSync(filePath)) {
        await fsp.unlink(filePath)
        console.log(`已删除视频文件: ${filePath}`)
      } else {
        console.log('视频文件不存在，无需删除:', filePath)
      }
    } catch (error) {
      console.warn('删除视频文件失败:', error)
    }

    // 更新项目信息
    await this.svc.update(id, { video_url: null, video_filename: null })

    return { message: '视频删除成功' }
  }

  @Get(':id/video')
  async getVideo(@Param('id') idParam: string, @Res() res: any, @Req() req: any) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!project.video_url) {
      throw new NotFoundException('该项目没有视频文件')
    }

    try {
      // 直接从数据库URL构建相对路径
      const urlWithoutQuery = project.video_url.split('?')[0]
      console.log('数据库URL:', urlWithoutQuery)
      
      // 从 /uploads/projects/2024/智能农业监控/项目名称演示视频.mp4 提取相对路径
      let relativePath: string
      if (urlWithoutQuery.startsWith('/uploads/')) {
        relativePath = urlWithoutQuery.substring('/uploads/'.length)
      } else if (urlWithoutQuery.startsWith('uploads/')) {
        relativePath = urlWithoutQuery.substring('uploads/'.length)
      } else {
        relativePath = urlWithoutQuery
      }
      
      const filePath = path.join('data', 'uploads', relativePath)
      console.log('视频文件路径:', filePath)
      console.log('视频文件路径（绝对路径）:', path.resolve(filePath))

      // 检查文件是否存在，如果不存在，尝试通过目录遍历找到文件（处理中文路径问题）
      let actualFilePath: string | undefined
      if (fs.existsSync(filePath)) {
        actualFilePath = filePath
        console.log('视频文件存在（直接路径）')
      } else {
        console.log('视频文件不存在（直接路径），尝试通过目录遍历查找...')
        // 如果直接路径不存在，尝试通过目录遍历找到文件
        const pathParts = relativePath.split('/')
        const yearDir = pathParts[1] // 2025
        const projectDir = pathParts[2] // 数学建模竞赛训练营
        const filename = pathParts[3] // 数学建模竞赛训练营演示视频.mp4
        
        const yearPath = path.join('data', 'uploads', 'projects', yearDir)
        console.log('年份目录路径:', yearPath)
        
        if (fs.existsSync(yearPath)) {
          const projectDirs = fs.readdirSync(yearPath)
          console.log('项目目录列表:', projectDirs)
          
          // 查找匹配的项目目录
          const matchedProjectDir = projectDirs.find(dir => 
            dir === projectDir || dir.includes(projectDir) || projectDir.includes(dir)
          ) || projectDirs[0] // 如果找不到，使用第一个
          console.log('使用项目目录:', matchedProjectDir)
          
          if (matchedProjectDir) {
            const projectPath = path.join(yearPath, matchedProjectDir)
            console.log('找到项目目录:', projectPath)
            
            const files = fs.readdirSync(projectPath)
            console.log('项目目录中的文件:', files)
            
            // 查找视频文件
            const videoFile = files.find(file => 
              (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.ogg') || file.endsWith('.mov')) && 
              (file === filename || file.includes('演示视频') || file.includes('video'))
            )
            
            if (videoFile) {
              actualFilePath = path.join(projectPath, videoFile)
              console.log('找到视频文件:', actualFilePath)
            }
          }
        }
      }
      
      if (!actualFilePath || !fs.existsSync(actualFilePath)) {
        console.error('视频文件不存在:', filePath)
        console.error('尝试的路径:', actualFilePath)
        throw new NotFoundException('视频文件不存在')
      }
      
      console.log('最终视频文件路径:', actualFilePath)

      // 根据文件扩展名确定Content-Type
      const ext = path.extname(actualFilePath).toLowerCase()
      const contentTypeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime'
      }
      const contentType = contentTypeMap[ext] || 'video/mp4'

      // 设置响应头
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(project.video_filename || 'video.mp4')}`)
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range')

      // 支持Range请求（用于视频播放）
      const stat = fs.statSync(actualFilePath)
      const fileSize = stat.size
      console.log('视频文件大小:', fileSize, 'bytes')
      const range = req.headers.range
      console.log('Range请求:', range)

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunksize = (end - start) + 1
        console.log('Range请求范围:', start, '-', end, '大小:', chunksize)
        const file = fs.createReadStream(actualFilePath, { start, end })
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        }
        res.writeHead(206, head)
        file.pipe(res)
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        }
        res.writeHead(200, head)
        console.log('发送完整视频文件，大小:', fileSize)
        fs.createReadStream(actualFilePath).pipe(res)
      }
    } catch (error) {
      console.error('获取视频文件失败:', error)
      throw new NotFoundException('无法获取视频文件')
    }
  }

  @Delete(':id/images')
  async deleteImage(@Param('id') idParam: string) {
    const id = Number(idParam)
    const project = await this.svc.detail(id)
    if (!project) throw new NotFoundException('项目不存在')

    if (!project.cover_url) {
      throw new BadRequestException('该项目没有封面图片')
    }

    // 只删除图片文件，不删除整个文件夹
    const urlWithoutQuery = project.cover_url.split('?')[0]
    console.log('删除图片 - 原始 cover_url:', project.cover_url)
    
    // 直接构建正确的文件路径
    let filePath: string
    if (urlWithoutQuery.startsWith('/uploads/')) {
      // 格式: /uploads/projects/年份/项目名称/文件名
      const relativePath = urlWithoutQuery.substring('/uploads/'.length)
      filePath = path.join(DataManager.getInstance().getUploadsPath(), relativePath)
    } else if (urlWithoutQuery.startsWith('uploads/')) {
      // 格式: uploads/projects/年份/项目名称/文件名
      const relativePath = urlWithoutQuery.substring('uploads/'.length)
      filePath = path.join(DataManager.getInstance().getUploadsPath(), relativePath)
    } else if (urlWithoutQuery.startsWith('projects/')) {
      // 格式: projects/年份/项目名称/文件名
      filePath = path.join(DataManager.getInstance().getUploadsPath(), urlWithoutQuery)
    } else {
      // 其他格式，直接拼接
      filePath = path.join(DataManager.getInstance().getUploadsPath(), urlWithoutQuery)
    }
    
    console.log('删除图片 - 最终路径:', filePath)
    
    try {
      await fsp.unlink(filePath)
      console.log(`已删除图片文件: ${filePath}`)
    } catch (error) {
      console.warn('删除图片文件失败:', error)
    }

    // 更新项目信息
    await this.svc.update(id, { cover_url: null })

    return { message: '图片删除成功' }
  }

  @Post('batch')
  async batchCreate(@Body() body: { projects: Array<{
    title: string;
    mentor: string;
    status?: string;
    year?: number;
    excellent?: boolean;
    description?: string;
    team_members?: string[] | string;
  }> }) {
    if (!body.projects || !Array.isArray(body.projects)) {
      throw new BadRequestException('请提供项目数组')
    }

    const results = []
    const errors = []

    // 获取学期开始日期
    const semesterStart = await this.cfg.getSemesterStartMondayISO()

    for (let i = 0; i < body.projects.length; i++) {
      try {
        const project = body.projects[i]
        
        // 验证必填字段
        if (!project.title || !project.mentor) {
          errors.push(`第${i + 1}行：项目标题和导师为必填项`)
          continue
        }
        
        // 验证团队成员字段（必填）
        if (!project.team_members) {
          errors.push(`第${i + 1}行：团队成员为必填项`)
          continue
        }

        // 处理团队成员字段并自动计算人数
        let team_members: string[] = []
        let member_count = 1 // 默认值
        if (project.team_members) {
          if (typeof project.team_members === 'string') {
            team_members = project.team_members.split(',').map(m => m.trim()).filter(Boolean)
            member_count = team_members.length
          } else if (Array.isArray(project.team_members)) {
            team_members = project.team_members.filter(Boolean)
            member_count = team_members.length
          }
        }

        // 检查是否完全重复（只检查项目名称、年份、团队成员三个字段）
        const year = project.year || new Date().getFullYear()
        const existing = await this.svc.findByTitleAndYear(project.title, year)
        if (existing) {
          // 检查是否三个关键字段都相同
          const existingTeamMembers = existing.team_members_json ? 
            JSON.parse(existing.team_members_json) : []
          const isCompletelyDuplicate = 
            existing.title === project.title &&
            existing.year === year &&
            JSON.stringify(existingTeamMembers?.sort()) === JSON.stringify(team_members.sort())
          
          if (isCompletelyDuplicate) {
            errors.push(`第${i + 1}行：项目"${project.title}"在${year}年已存在完全相同的记录（项目名称、年份、团队成员都相同）`)
            continue
          }
        }

        const created = await this.svc.create({
          title: project.title,
          mentor: project.mentor,
          member_count: member_count,
          status: project.status as any,
          year: year,
          excellent: project.excellent || false,
          description: project.description || '',
          team_members: team_members
        }, semesterStart)
        
        results.push(created)
      } catch (error: any) {
        errors.push(`第${i + 1}行：${error.message || '未知错误'}`)
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors
    }
  }

  @Post('clear-all-data')
  async clearAllData() {
    try {
      // 清空数据表，保留配置表
      await this.svc.clearAllData()
      return {
        success: true,
        message: '所有数据已清空，配置信息已保留'
      }
    } catch (error: any) {
      throw new BadRequestException(`清空数据失败: ${error.message}`)
    }
  }

  @Post('clear-all-videos')
  async clearAllVideos() {
    try {
      const result = await this.svc.clearAllVideos()
      return {
        success: true,
        message: `已删除 ${result.deletedCount} 个项目的视频，共删除 ${result.fileCount} 个视频文件`
      }
    } catch (error: any) {
      throw new BadRequestException(`删除所有视频失败: ${error.message}`)
    }
  }

  @Post('fix-all-paper-urls')
  async fixAllPaperUrls() {
    try {
      const projects = await this.svc.listByYearSorted()
      const results = []
      let successCount = 0
      let errorCount = 0

      for (const project of projects) {
        if (!project.paper_url) continue

        try {
          // 修复多重编码的URL
          let fixedUrl = project.paper_url
          let decodeCount = 0
          const maxDecodes = 5
          
          while (fixedUrl.includes('%') && decodeCount < maxDecodes) {
            const newUrl = decodeURIComponent(fixedUrl)
            if (newUrl === fixedUrl) break
            fixedUrl = newUrl
            decodeCount++
          }

          // 确保URL格式正确
          if (!fixedUrl.startsWith('/uploads/')) {
            const filename = project.paper_filename || 'paper.pdf'
            fixedUrl = `/uploads/projects/${project.year}/${project.title}/${filename}`
          }

          // 如果URL有变化，更新数据库
          if (fixedUrl !== project.paper_url) {
            await this.svc.update(project.id, { paper_url: fixedUrl })
            results.push({
              id: project.id,
              title: project.title,
              old_url: project.paper_url,
              new_url: fixedUrl,
              decode_count: decodeCount
            })
            successCount++
          }
        } catch (error) {
          console.error(`修复项目 ${project.id} PDF URL失败:`, error)
          errorCount++
        }
      }

      return {
        message: '批量修复PDF URL完成',
        total_projects: projects.length,
        projects_with_papers: projects.filter(p => p.paper_url).length,
        fixed_count: successCount,
        error_count: errorCount,
        results: results
      }
    } catch (error: any) {
      throw new BadRequestException(`批量修复PDF URL失败: ${error.message}`)
    }
  }

}
