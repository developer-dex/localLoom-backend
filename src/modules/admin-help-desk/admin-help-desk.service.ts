import { HelpDeskRequest } from '../../models/help-desk-request.model';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';
import { NotFoundException } from '../../common/exceptions';
import { WhereOptions } from 'sequelize';

interface ListParams {
  page: number;
  limit: number;
  status?: string;
}

export class AdminHelpDeskService {
  async list(params: ListParams): Promise<PaginatedResult<HelpDeskRequest>> {
    const { page, limit, status } = params;
    const offset = (page - 1) * limit;

    const where: WhereOptions = {};
    if (status) where.status = status;

    const { count: total, rows: data } = await HelpDeskRequest.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string): Promise<HelpDeskRequest> {
    const request = await HelpDeskRequest.findByPk(id);
    if (!request) throw new NotFoundException('Help desk request not found');
    return request;
  }

  async resolve(id: string): Promise<HelpDeskRequest> {
    const request = await HelpDeskRequest.findByPk(id);
    if (!request) throw new NotFoundException('Help desk request not found');
    await request.update({ status: 'resolved' });
    return request;
  }
}
