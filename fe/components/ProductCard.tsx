'use client'

interface Product {
  id: number
  name: string
  price: number
  priceAfterDiscount: number
  discount: number
  imageUrl: string
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">

      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-40 object-cover rounded"
      />

      <h3 className="mt-3 font-semibold text-gray-900">
        {product.name}
      </h3>

      <div className="mt-2 flex items-center gap-2">

        <span className="text-red-600 font-bold">
          {product.priceAfterDiscount.toLocaleString()}₫
        </span>

        {product.discount > 0 && (
          <span className="text-gray-400 line-through text-sm">
            {product.price.toLocaleString()}₫
          </span>
        )}

      </div>

    </div>
  )
}