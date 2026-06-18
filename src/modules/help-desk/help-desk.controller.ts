import { Request, Response } from 'express';
import { HelpDeskService } from './help-desk.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { CreateHelpDeskRequestDto } from './help-desk.interface';

export class HelpDeskController {
  private helpDeskService: HelpDeskService;

  constructor() {
    this.helpDeskService = new HelpDeskService();
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const dto: CreateHelpDeskRequestDto = req.body;
    const request = await this.helpDeskService.createRequest(dto);
    ApiResponse.created(res, request, 'Help desk request submitted successfully');
  });
}
