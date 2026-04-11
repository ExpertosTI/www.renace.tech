import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from '../dto/create-product.dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // Listar productos
    @Get()
    async listProducts(
        @Query('companyId') companyId?: string,
        @Query('sector') sector?: string,
        @Query('busqueda') busqueda?: string,
        @Query('minPrice') minPrice?: number,
        @Query('maxPrice') maxPrice?: number,
        @Query('page') page: number = 1
    ) {
        return this.productsService.listProducts({ companyId, sector, busqueda, minPrice, maxPrice }, page);
    }

    // Detalle de producto
    @Get(':id')
    async getProduct(@Param('id') id: string) {
        return this.productsService.getProduct(id);
    }

    // Productos de mi empresa
    @Get('my/catalog')
    async getMyCatalog(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        return this.productsService.getMyCatalog(token);
    }

    // Crear producto
    @Post()
    async createProduct(
        @Body() body: CreateProductDto,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.productsService.createProduct(token, body);
    }

    // Actualizar producto
    @Post(':id/update')
    async updateProduct(
        @Param('id') id: string,
        @Body() body: any,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.productsService.updateProduct(id, token, body);
    }

    // Eliminar producto
    @Post(':id/delete')
    async deleteProduct(
        @Param('id') id: string,
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.productsService.deleteProduct(id, token);
    }

    // Importar productos (CSV)
    @Post('import')
    async importProducts(
        @Body() body: { products: any[] },
        @Headers('authorization') auth: string
    ) {
        const token = auth?.replace('Bearer ', '');
        return this.productsService.importProducts(token, body.products);
    }
}
