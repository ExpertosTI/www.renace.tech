export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-6 border animate-pulse">
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                    <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                        <div className="h-6 bg-gray-200 rounded-full w-16" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <tr className="animate-pulse">
            <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                    </div>
                </div>
            </td>
            <td className="py-4 px-4">
                <div className="h-4 bg-gray-200 rounded w-24" />
            </td>
            <td className="py-4 px-4">
                <div className="h-4 bg-gray-200 rounded w-16" />
            </td>
            <td className="py-4 px-4">
                <div className="h-6 bg-gray-200 rounded-full w-20" />
            </td>
        </tr>
    );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border animate-pulse">
                    <div className="h-48 bg-gray-200" />
                    <div className="p-4">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                        <div className="h-6 bg-gray-200 rounded w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-2xl" />
            <div className="bg-white rounded-b-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-xl -mt-12" />
                    <div className="flex-1 pt-4">
                        <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-32" />
                    </div>
                </div>
                <div className="mt-6 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                    <div className="h-4 bg-gray-200 rounded w-4/6" />
                </div>
            </div>
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
                    <div className="h-6 bg-gray-200 rounded w-16 mb-1" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
            ))}
        </div>
    );
}

export function MessageSkeleton() {
    return (
        <div className="flex gap-3 p-4 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
        </div>
    );
}
