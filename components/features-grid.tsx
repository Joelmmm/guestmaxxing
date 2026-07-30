import { Fragment } from "react"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { UsersIcon, GridFourIcon, CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr"

const features = [
  {
    title: "Know Your Regulars",
    description: "Build a comprehensive guest database automatically with every booking. Remember seating preferences, track VIPs, and deliver the personalized hospitality that keeps people coming back.",
    icon: UsersIcon,
  },
  {
    title: "Intelligent Floor Plans",
    description: "Perfectly match party sizes to the right tables across your bar, patio, and main dining room. Maximize your seating capacity and increase your nightly revenue.",
    icon: GridFourIcon,
  },
  {
    title: "Dynamic Scheduling",
    description: "Need to close the patio for rain or host a private buyout? Easily block off specific times, tables, or entire dining areas with just a few clicks—no manual cancellations required.",
    icon: CalendarPlusIcon,
  }
]

export function FeaturesGrid() {
  return (
    <section className="container py-16">
      <div className=" mb-16 mx-auto text-center">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">Why Guestmaxxing?</h2>
        <p className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
          Everything you need to run a full house
        </p>
      </div>

      <ItemGroup className="gap-4">
        {features.map((feature, index) => (
          <Fragment key={feature.title}>
            <Item className="p-6 rounded-xl border bg-card/50 hover:bg-card transition-colors flex items-start gap-5">
              <ItemContent className="gap-2">
                <ItemTitle className="text-lg font-semibold text-foreground line-clamp-none flex">
                  <feature.icon className="size-6 text-primary" weight="duotone" /> {feature.title}
                </ItemTitle>
                <ItemDescription className="text-base text-muted-foreground leading-relaxed line-clamp-none">
                  {feature.description}
                </ItemDescription>
              </ItemContent>
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    </section>
  )
}

