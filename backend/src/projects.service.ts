// 功能：项目数据服务（查询、更新、清理与文件处理）。
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ProjectEntity, ProjectStatus } from './entities/project.entity';
import { semesterYear } from './time.utils';
import { DataManager } from './utils/dataManager';
import { ClassService } from './class.service';
import * as fsp from 'fs/promises';
import * as path from 'path';

function assertStatus(s: any): asserts s is ProjectStatus {
  if (!['reviewing','ongoing','done'].includes(s)) {
    throw new BadRequestException('status must be reviewing|ongoing|done');
  }
}
const weight = (s: ProjectStatus) => (s === 'ongoing' ? 2 : s === 'reviewing' ? 1 : 0);

@Injectable()
export class ProjectsService {
  private dataManager: DataManager;
  
  constructor(
    @InjectRepository(ProjectEntity) private readonly repo: Repository<ProjectEntity>,
    private readonly classService: ClassService
  ) {
    this.dataManager = DataManager.getInstance();
  }

  async listByYearSorted(year?: number) {
    const qb = this.repo.createQueryBuilder('p');
    if (year) qb.where('p.year = :y', { y: year });
    const items = await qb.orderBy('p.id', 'DESC').getMany();
    
    // 解析 JSON 成员列表。
    const processedItems = items.map(item => {
      if (item.team_members_json) {
        try {
          (item as any).team_members = JSON.parse(item.team_members_json);
        } catch {
          (item as any).team_members = [];
        }
      } else {
        (item as any).team_members = [];
      }
      return item;
    });
    
    return processedItems.sort((a, b) => weight(b.status) - weight(a.status) || b.id - a.id);
  }

  async detail(id: number) {
    const p = await this.repo.findOneBy({ id });
    if (!p) throw new BadRequestException('project not found');
    
    // 解析 JSON 成员列表。
    if (p.team_members_json) {
      try {
        (p as any).team_members = JSON.parse(p.team_members_json);
      } catch {
        (p as any).team_members = [];
      }
    } else {
      (p as any).team_members = [];
    }
    
    return p;
  }

  async findByTitleAndYear(title: string, year: number) {
    return await this.repo.findOneBy({ title, year });
  }

  async create(payload: {
    title: string; mentor: string; member_count: number;
    status?: ProjectStatus; year?: number; excellent?: boolean;
    description?: string; students?: string[];
    team_members?: string[]; paper_url?: string; paper_filename?: string;
    video_url?: string; video_filename?: string;
    project_start_date?: string; project_end_date?: string;
  }, semesterStartMondayISO: string) {
    const status = (payload.status ?? 'reviewing') as ProjectStatus;
    assertStatus(status);
    const year = payload.year ?? semesterYear(new Date(semesterStartMondayISO));
    
    // 保持传入状态，不强制修改。
    const finalStatus = status;
    
    const ent = this.repo.create({
      title: String(payload.title),
      mentor: String(payload.mentor),
      member_count: Math.max(0, Math.floor(Number(payload.member_count))),
      status: finalStatus, year, excellent: !!payload.excellent,
      description: payload.description ?? '',
      students_json: payload.students ? JSON.stringify(payload.students) : null,
      cover_url: null,
      team_members_json: payload.team_members ? JSON.stringify(payload.team_members) : null,
      paper_url: payload.paper_url || null,
      paper_filename: payload.paper_filename || null,
      video_url: payload.video_url || null,
      video_filename: payload.video_filename || null,
      project_start_date: payload.project_start_date || null,
      project_end_date: payload.project_end_date || null
    });
    return await this.repo.save(ent);
  }

  async update(id: number, body: Partial<ProjectEntity> & { students?: string[]; team_members?: string[]; paper_url?: string | null; paper_filename?: string | null; video_url?: string | null; video_filename?: string | null; project_start_date?: string | null; project_end_date?: string | null }) {
    const p = await this.detail(id);
    if (body.title !== undefined) p.title = String(body.title);
    if (body.mentor !== undefined) p.mentor = String(body.mentor);
    if (body.member_count !== undefined) p.member_count = Math.max(0, Math.floor(Number(body.member_count)));
    if (body.status !== undefined) { 
      assertStatus(body.status); 
      p.status = body.status;
      
      // 自动设置立项/完成时间。
      const now = new Date().toISOString();
      if (body.status === 'ongoing' && !p.project_start_date) {
        p.project_start_date = now;
      }
      if (body.status === 'done' && !p.project_end_date) {
        p.project_end_date = now;
      }
    }
    if (body.excellent !== undefined) {
      p.excellent = !!body.excellent;
      // 设为优秀时自动切换为已完成。
      if (body.excellent && p.status !== 'done') {
        p.status = 'done';
        if (!p.project_end_date) {
          p.project_end_date = new Date().toISOString();
        }
      }
    }
    if (body.year !== undefined) p.year = Number(body.year);
    if (body.description !== undefined) p.description = String(body.description);
    if (body.students !== undefined) p.students_json = JSON.stringify(body.students ?? []);
    if (body.cover_url !== undefined) p.cover_url = body.cover_url;
    if (body.team_members !== undefined) p.team_members_json = JSON.stringify(body.team_members ?? []);
    if (body.paper_url !== undefined) p.paper_url = body.paper_url;
    if (body.paper_filename !== undefined) p.paper_filename = body.paper_filename;
    if (body.video_url !== undefined) p.video_url = body.video_url;
    if (body.video_filename !== undefined) p.video_filename = body.video_filename;
    if (body.project_start_date !== undefined) p.project_start_date = body.project_start_date;
    if (body.project_end_date !== undefined) p.project_end_date = body.project_end_date;
    return await this.repo.save(p);
  }

  async remove(id: number) {
    const p = await this.detail(id);
    await this.repo.delete({ id });
    return p;
  }

  async removeByYear(year?: number) {
    if (year) {
      const result = await this.repo.delete({ year });
      return { deletedCount: result.affected || 0, year };
    } else {
      // 删除所有记录（更安全的删除方式）。
      const result = await this.repo.createQueryBuilder()
        .delete()
        .execute();
      return { deletedCount: result.affected || 0, year: 'all' };
    }
  }

  async getYears() {
    const result = await this.repo.createQueryBuilder('p')
      .select('DISTINCT p.year', 'year')
      .orderBy('p.year', 'DESC')
      .getRawMany();
    return result.map(row => row.year).filter(year => year != null);
  }

  async listExcellentForCarousel(currentYear: number) {
    const items = await this.repo.createQueryBuilder('p')
      .where('(p.year < :y OR p.year = :y) AND p.excellent = 1', { y: currentYear })
      .orderBy('p.year', 'DESC').addOrderBy('p.id', 'DESC').getMany();
    
    // 解析 JSON 成员列表。
    return items.map(item => {
      if (item.team_members_json) {
        try {
          (item as any).team_members = JSON.parse(item.team_members_json);
        } catch {
          (item as any).team_members = [];
        }
      } else {
        (item as any).team_members = [];
      }
      return item;
    });
  }

  async statsByYear() {
    const qb = this.repo.createQueryBuilder('p')
      .select('p.year','year')
      .addSelect('COUNT(1)','projects')
      .addSelect('SUM(p.member_count)','participants')
      .groupBy('p.year')
      .orderBy('p.year','ASC');
    const rows = await qb.getRawMany();
    return rows.map(r => ({
      year: Number(r.year),
      projects: Number(r.projects),
      participants: Number(r.participants || 0)
    }));
  }

  async clearAllData() {
    // 清空业务数据，保留配置表。
    // 数据表：sessions, projects, banner, classes
    // 配置表：labs, config_kv, calendar_override
    
    // 清空项目数据。
    await this.repo.clear()
    
    // 清空课表数据（SQL 直接执行）。
    await this.repo.query('DELETE FROM sessions')
    
    // 清空横幅数据。
    await this.repo.query('DELETE FROM banner')
    
    // 清空班级数据。
    await this.classService.clearAllClasses()
    
    // 重置自增 ID。
    await this.repo.query('DELETE FROM sqlite_sequence WHERE name IN ("projects", "sessions", "banner", "classes")')
    
    // 清理上传文件内容但保留目录结构。
    await this.dataManager.clearUploadsContent();
  }

  async clearProjectsData(year?: number) {
    if (year) {
      // 删除指定年份的项目数据。
      await this.repo.delete({ year })
    } else {
      // 删除所有项目数据。
      await this.repo.clear()
    }
  }

  async clearAllVideos(): Promise<{ deletedCount: number; fileCount: number }> {
    // 获取所有有视频的项目。
    const projects = await this.repo.find({
      where: { video_url: Not(IsNull()) }
    });

    let fileCount = 0;

    // 删除所有视频文件。
    for (const project of projects) {
      if (project.video_url) {
        try {
          // 从 /uploads/projects/... 提取相对路径。
          let relativePath: string;
          const urlWithoutQuery = project.video_url.split('?')[0];
          
          if (urlWithoutQuery.startsWith('/uploads/')) {
            relativePath = urlWithoutQuery.substring('/uploads/'.length);
          } else if (urlWithoutQuery.startsWith('uploads/')) {
            relativePath = urlWithoutQuery.substring('uploads/'.length);
          } else {
            relativePath = urlWithoutQuery;
          }
          
          const fullPath = path.join('data', 'uploads', relativePath);
          
          if (await fsp.access(fullPath).then(() => true).catch(() => false)) {
            await fsp.unlink(fullPath);
            fileCount++;
          }
        } catch (error) {
          console.warn(`删除视频文件失败: ${project.video_url}`, error);
        }
      }
    }

    // 清空所有项目的视频字段
    await this.repo
      .createQueryBuilder()
      .update(ProjectEntity)
      .set({ video_url: null, video_filename: null })
      .where('video_url IS NOT NULL')
      .execute();

    return { deletedCount: projects.length, fileCount };
  }

}
