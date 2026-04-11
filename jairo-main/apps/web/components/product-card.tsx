import { cn } from "@/lib/utils"
import { ShoppingCart, Zap } from "lucide-react"

interface ProductCardProps {
    title: string
    price: number
    originalPrice?: number
    image: string
    soldCount?: number
    isFlashSale?: boolean
}

export function ProductCard({
    title,
    price,
    originalPrice,
    image,
    soldCount = 0,
    isFlashSale = false,
}: ProductCardProps) {
    const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0

    return (
        <div className="group relative bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 hover:border-primary/50">
            {/* Flash Sale Badge */}
            {isFlashSale && (
                <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-2 py-1 z-10 flex items-center gap-1 animate-pulse">
                    <Zap size={12} fill="white" /> FLASH SALE
                </div>
            )}

            {/* Image Area */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Quick Add Overlay */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-primary hover:bg-orange-600 text-white rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl font-bold flex items-center gap-2">
                        <ShoppingCart size={18} /> Add to Cart
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                <h3 className="text-sm text-gray-700 font-medium line-clamp-2 leading-tight mb-2 h-10 group-hover:text-primary transition-colors">
                    {title}
                </h3>

                {/* Price Section */}
                <div className="flex items-end gap-2 mb-1">
                    <span className="text-xl font-black text-red-600">
                        ${price.toFixed(2)}
                    </span>
                    {originalPrice && (
                        <span className="text-xs text-gray-400 line-through mb-1">
                            ${originalPrice.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Footer info */}
                <div className="flex items-center justify-between">
                    {discount > 0 && (
                        <span className="text-xs font-bold text-primary bg-orange-100 px-1 rounded">
                            -{discount}%
                        </span>
                    )}
                    <span className="text-xs text-gray-500">
                        {soldCount}+ sold
                    </span>
                </div>
            </div>
        </div>
    )
}
