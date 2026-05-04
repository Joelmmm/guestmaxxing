import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, endOfDay } from "date-fns";
import { calculateChange } from "./utils";

export async function getDashboardStats(restaurantId: string, days: number = 30) {
  const now = new Date();
  
  // Current Period (e.g., last 30 days)
  const currentPeriodStart = startOfDay(subDays(now, days));
  const currentPeriodEnd = endOfDay(now);
  
  // Previous Period (e.g., 30 days before the current period)
  const previousPeriodStart = startOfDay(subDays(now, days * 2));
  const previousPeriodEnd = startOfDay(subDays(now, days));

  // Fetch Current Period Reservations
  const currentReservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      reservationDate: {
        gte: currentPeriodStart,
        lte: currentPeriodEnd,
      },
      status: {
        not: "CANCELLED",
      },
    },
    include: {
      guest: true,
    },
  });

  // Fetch Previous Period Reservations
  const previousReservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      reservationDate: {
        gte: previousPeriodStart,
        lt: previousPeriodEnd,
      },
      status: {
        not: "CANCELLED",
      },
    },
  });

  // Total Reservations
  const totalReservations = currentReservations.length;
  const previousTotalReservations = previousReservations.length;
  
  const reservationsChange = calculateChange(totalReservations, previousTotalReservations);

  // Average Party Size
  const currentPartySizeSum = currentReservations.reduce((acc, res) => acc + res.partySize, 0);
  const previousPartySizeSum = previousReservations.reduce((acc, res) => acc + res.partySize, 0);
  
  const avgPartySize = totalReservations > 0 ? Number((currentPartySizeSum / totalReservations).toFixed(1)) : 0;
  const prevAvgPartySize = previousTotalReservations > 0 ? Number((previousPartySizeSum / previousTotalReservations).toFixed(1)) : 0;
  const partySizeChange = calculateChange(avgPartySize, prevAvgPartySize);

  // Peak Hours
  const currentHourCounts = currentReservations.reduce((acc, res) => {
    const hour = new Date(res.startTime).getUTCHours(); // Wait, this should use the restaurant's timezone ideally, but for now we'll do UTC or extract hour
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  let peakHour = 0;
  let maxCount = -1;
  Object.entries(currentHourCounts).forEach(([hourStr, count]) => {
    const hour = parseInt(hourStr);
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  });

  const formatHour = (h: number) => {
    const nextH = (h + 2) % 24;
    return `${h.toString().padStart(2, '0')}:00 - ${nextH.toString().padStart(2, '0')}:00`;
  };
  const peakHoursStr = maxCount > 0 ? formatHour(peakHour) : "N/A";
  
  // Previous Peak Hours for change
  const previousHourCounts = previousReservations.reduce((acc, res) => {
    const hour = new Date(res.startTime).getUTCHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  let prevMaxCount = -1;
  Object.values(previousHourCounts).forEach(count => {
    if (count > prevMaxCount) prevMaxCount = count;
  });
  
  const peakHoursChange = calculateChange(maxCount, prevMaxCount); // Not exactly a percentage change of "Peak Hours" but change in peak volume

  // Returning Guests
  // We need to know if the guest had reservations before this period.
  // A simpler way: count unique guests in current period who have > 1 total reservations.
  const uniqueGuestIds = new Set(
    currentReservations
      .map(r => r.guestId)
      .filter(Boolean) as string[]
  );

  const guestsWithPriorReservations = await prisma.reservation.groupBy({
    by: ['guestId'],
    where: {
      restaurantId,
      guestId: { in: Array.from(uniqueGuestIds) },
      status: { not: "CANCELLED" },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  const returningGuestIds = new Set(guestsWithPriorReservations.map(g => g.guestId));
  const returningReservationsCount = currentReservations.filter(r => r.guestId && returningGuestIds.has(r.guestId)).length;
  
  const returningGuestsPercent = totalReservations > 0 ? Number(((returningReservationsCount / totalReservations) * 100).toFixed(1)) : 0;
  
  // To calculate returning guest change properly, we'd need to do the same for previous period
  const prevUniqueGuestIds = new Set(
    previousReservations
      .map(r => r.guestId)
      .filter(Boolean) as string[]
  );
  
  const prevGuestsWithPriorReservations = await prisma.reservation.groupBy({
    by: ['guestId'],
    where: {
      restaurantId,
      guestId: { in: Array.from(prevUniqueGuestIds) },
      reservationDate: { lt: previousPeriodEnd }, // Only count history up to previous period end
      status: { not: "CANCELLED" },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
  });
  const prevReturningGuestIds = new Set(prevGuestsWithPriorReservations.map(g => g.guestId));
  const prevReturningReservationsCount = previousReservations.filter(r => r.guestId && prevReturningGuestIds.has(r.guestId)).length;
  const prevReturningGuestsPercent = previousTotalReservations > 0 ? Number(((prevReturningReservationsCount / previousTotalReservations) * 100).toFixed(1)) : 0;
  
  const returningGuestsChange = calculateChange(returningGuestsPercent, prevReturningGuestsPercent);

  return {
    totalReservations: {
      value: totalReservations.toString(),
      change: reservationsChange,
    },
    averagePartySize: {
      value: avgPartySize.toString(),
      change: partySizeChange,
    },
    peakHours: {
      value: peakHoursStr,
      change: peakHoursChange,
    },
    returningGuests: {
      value: `${returningGuestsPercent}%`,
      change: returningGuestsChange,
    }
  };
}
