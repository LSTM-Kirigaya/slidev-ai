import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class CreateSlideDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(['public', 'private'])
    visibility!: 'public' | 'private';
}


export interface OutlinesDto {
    outlines: any;
}

// 定义 slidesPath 数据结构
export interface SlidevProjectDto {
    /**
     * @example "test2"
     */
    name: string;
    /**
     * @example ".slidev-mcp/test2"
     */
    home: string;
    /**
     * @example ".slidev-mcp/test2/slides.md"
     */
    slides_path: string;
}