import { prisma } from "@/lib/prisma";
import { subDays, eachDayOfInterval, format } from "date-fns";
import { getRestaurantTodayStr, parseDateStr } from "@/lib/time-utils";

export async function getReservationTrends(restaurantId: string, timezone: string, days: number = 30) {
  const todayStr = getRestaurantTodayStr(timezone);
  const todayUtc = parseDateStr(todayStr); // UTC midnight of today in restaurant's TZ
  const startDateUtc = subDays(todayUtc, days - 1); // Range includes today

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      reservationDate: {
        gte: startDateUtc,
        lte: todayUtc,
      },
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      reservationDate: true,
    },
  });

  // Create all days in the interval to ensure zero-booking days are included
  const allDays = eachDayOfInterval({ start: startDateUtc, end: todayUtc });
  
  const trendsMap = new Map<string, number>();
  allDays.forEach(day => {
    const formatted = format(day, "MMM dd");
    trendsMap.set(formatted, 0);
  });

  reservations.forEach(res => {
    // reservationDate is stored as UTC midnight representing the wall-clock date
    const formatted = format(res.reservationDate, "MMM dd");
    if (trendsMap.has(formatted)) {
      trendsMap.set(formatted, trendsMap.get(formatted)! + 1);
    }
  });

  return Array.from(trendsMap.entries()).map(([date, bookings]) => ({
    date,
    bookings,
  }));
}
