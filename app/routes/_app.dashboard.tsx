import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "~/@shadcn/lib/utils";
import { Button } from "~/@shadcn/ui/button";
import { Calendar } from "~/@shadcn/ui/calendar";
import { Checkbox } from "~/@shadcn/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "~/@shadcn/ui/popover";
import { Separator } from "~/@shadcn/ui/separator";
import { getUser } from "~/lib/auth.lucia.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  return json({
    user,
    developers: [
      user,
      { ...user, id: crypto.randomUUID(), username: "Louis" },
      { ...user, id: crypto.randomUUID(), username: "Alejandro" },
      { ...user, id: crypto.randomUUID(), username: "Javier" },
    ],
    repositories: [
      { id: crypto.randomUUID(), name: "call-service" },
      { id: crypto.randomUUID(), name: "pulse" },
      { id: crypto.randomUUID(), name: "livecall" },
      { id: crypto.randomUUID(), name: "octopus" },
      { id: crypto.randomUUID(), name: "web" },
    ],
    calendar: [
      {
        date: "2023-06-14",
        count: 2,
        level: 1,
      },
      {
        date: "2023-06-22",
        count: 16,
        level: 3,
      },
    ],
  });
}

export default function App() {
  const { developers, repositories, calendar } = useLoaderData<typeof loader>();
  return (
    <div className="flex justify-between space-x-6">
      <aside className="flex flex-col space-y-6 w-48 grow-0 shrink-0 ">
        {/* <div className="flex flex-col text-center space-y-1  bg-neutral-50 py-4 rounded-2xl">
            <h2 className="text-muted-foreground font-extralight uppercase text-sm">
              My organisation
            </h2>
            <h3 className="font-semibold text-xl">Aircall</h3>
            <p className="flex flex-col">
              <span className="font-mono tracking-tight font-bold text-3xl">
                96
              </span>
              <span className="text-muted-foreground font-extralight">
                developers
              </span>
            </p>
          </div> */}

        <div className="flex flex-col space-y-3">
          <h4 className="text-muted-foreground font-semibold text-sm">
            Start date
          </h4>
          <DatePicker />
          <h4 className="text-muted-foreground font-semibold text-sm">
            End date
          </h4>
          <DatePicker />
        </div>

        <div className="flex flex-col space-y-3">
          <h4 className="text-muted-foreground font-semibold text-sm">
            Developers
          </h4>
          <div className="flex space-x-2 items-center">
            <Checkbox id={"all-dev"} />
            <label
              htmlFor={"all-dev"}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select all
            </label>
          </div>
          <Separator />
          <ul className="flex flex-col space-y-1 *:cursor-pointer *:flex *:items-center *:space-x-2">
            {developers.map(({ id, username }) => (
              <li key={`dev-${id}`}>
                <Checkbox id={id} />
                <label
                  htmlFor={id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {username}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <h4 className="text-muted-foreground font-semibold text-sm">
            Repositories
          </h4>
          <div className="flex space-x-2 items-center">
            <Checkbox id={"all-repos"} />
            <label
              htmlFor={"all-repos"}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select all
            </label>
          </div>
          <Separator />
          <ul className="flex flex-col space-y-1 *:cursor-pointer">
            {repositories.map(({ id, name }) => (
              <li key={`dev-${id}`} className="flex items-center space-x-2">
                <Checkbox id={id} />
                <label
                  htmlFor={id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      {/* Test */}
      <section>{/* <ActivityCalendar data={calendar} /> */}</section>
      <section>My dashboard</section>
    </div>
  );
}

export function DatePicker() {
  const [date, setDate] = useState<Date>();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-auto justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
