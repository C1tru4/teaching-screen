// 功能：大屏渲染数据接口。
import { Controller, Get, Query } from '@nestjs/common';
import { RenderService } from './render.service';

type LabParam = 'all' | number;
type ScopeParam = 'week' | 'semester';

@Controller('render')
export class RenderController {
  constructor(private readonly svc: RenderService) {}

  @Get()
  async get(
    @Query('template') template = 'default',
    @Query('date') date?: string,
    @Query('lab') labParam: string = 'all',
    @Query('scope') scopeParam: string = 'week',
    @Query('showDone') showDoneParam?: string,
    @Query('dataAnalysisConfig') dataAnalysisConfigParam?: string
  ) {
    const lab: LabParam = labParam === 'all' ? 'all' : Number(labParam) as number;
    const scope: ScopeParam = scopeParam === 'semester' ? 'semester' : 'week';
    const showDone = String(showDoneParam).toLowerCase() === 'true';
    const dataAnalysisConfig = dataAnalysisConfigParam ? JSON.parse(dataAnalysisConfigParam) : null;
    const key = `render:${date ?? ''}:${lab}:${scope}:${showDone}:${template}:${dataAnalysisConfigParam ?? ''}`;
    return this.svc.getCached(key, () => this.svc.buildRender({ date, lab, scope, showDone, dataAnalysisConfig }));
  }
}
