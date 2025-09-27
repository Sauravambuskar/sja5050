import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useBanners } from "@/hooks/useBanners"
import { Skeleton } from "@/components/ui/skeleton"
import { useNavigate } from "react-router-dom"
import Autoplay from "embla-carousel-autoplay"

export function BannerCarousel() {
  const { data: banners, isLoading, error } = useBanners()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="aspect-[2/1] md:aspect-[3/1] w-full rounded-lg" />
      </div>
    )
  }

  if (error || !banners || banners.length === 0) {
    // Don't render anything if there's an error or no banners. It's not a critical component.
    if (error) console.error("Failed to load banners:", error)
    return null
  }

  const handleBannerClick = (link: string | null) => {
    if (link) {
      if (link.startsWith('http')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(link);
      }
    }
  }

  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 5000,
          stopOnInteraction: true,
        }),
      ]}
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <Card 
              className="overflow-hidden border-none shadow-md rounded-lg"
              onClick={() => handleBannerClick(banner.link_to)}
            >
              <CardContent className={`relative flex aspect-[2/1] md:aspect-[3/1] items-center justify-center p-0 ${banner.link_to ? 'cursor-pointer' : ''}`}>
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white">
                  <h3 className="text-lg md:text-2xl font-bold drop-shadow-md">{banner.title}</h3>
                  {banner.description && <p className="text-sm md:text-base text-gray-200 mt-1 drop-shadow-sm">{banner.description}</p>}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      {banners.length > 1 && (
        <>
          <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
          <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:flex" />
        </>
      )}
    </Carousel>
  )
}