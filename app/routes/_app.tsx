import type { LoaderFunctionArgs } from "@remix-run/node";
import { Form, Outlet, useLoaderData } from "@remix-run/react";
import {
  Activity,
  Calendar,
  ChevronDown,
  Command,
  Inspect,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/@shadcn/ui/avatar";
import { Button } from "~/@shadcn/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/@shadcn/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/@shadcn/ui/dropdown-menu";
import { UserAuthenticated } from "~/lib/auth.types";
import { validateRequest } from "../lib/auth.lucia.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await block(request);
  return { user };
}

export async function action({ request }: LoaderFunctionArgs) {
  await block(request);
}

export default function Layout() {
  return (
    <div className="flex w-full">
      <Navigation />
      <main className="flex flex-col grow px-12 divide-y">
        <TopBar />
        <div className="flex py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <nav className="flex justify-between items-center py-8">
        <ul>
          <li className="flex items-center space-x-2">
            <Calendar size={14} />
            <span>26 Feb.</span>
          </li>
        </ul>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setOpen(true)}
            type="button"
            variant="outline"
            className="w-72 text-muted-foreground justify-between items-center"
          >
            <span>Search anything...</span>
            <kbd className="flex border rounded items-center text-[10px] bg-secondary px-1.5">
              <Command size={10} />
              <span>+K</span>
            </kbd>
          </Button>
          <div className="flex items-center space-x-1">
            <AccountMenu />
          </div>
        </div>
      </nav>
      <CommandMenu open={open} setOpen={setOpen} />
    </>
  );
}

function AccountMenu() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center space-x-1 cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.username} />
            <AvatarFallback className="uppercase">
              {user.email[0]}
            </AvatarFallback>
          </Avatar>
          <ChevronDown size={14} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem className="relative">
          <Form method="POST" action="/logout" className="w-full h-full">
            <button type="submit" className="text-left w-full h-full">
              Log out
            </button>
          </Form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navigation() {
  return (
    <menu className="flex flex-col py-10 pl-8 space-y-12 h-dvh w-64">
      <h1 className="font-mono font-semibold tracking-wider -mt-1 text-lg lg:text-xl">
        CF-Remix.
      </h1>
      <nav className="flex flex-col w-full space-y-2">
        <li className="text-muted-foreground w-full">
          <Button
            size="lg"
            variant="ghost"
            className="flex text-left justify-start px-3 w-full -ml-2 items-center space-x-2"
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </Button>
        </li>
        <li className="text-accent-foreground w-full">
          <Button
            size="lg"
            variant="ghost"
            className="flex text-left justify-start px-3 w-full -ml-2 items-center space-x-2"
          >
            <Activity size={14} />
            <span>Activity</span>
          </Button>
        </li>
        <li className="text-muted-foreground w-full">
          <Button
            size="lg"
            variant="ghost"
            className="flex text-left justify-start px-3 w-full -ml-2 items-center space-x-2"
          >
            <Inspect size={14} />
            <span>Insights</span>
          </Button>
        </li>
        <li className="text-muted-foreground w-full">
          <Button
            size="lg"
            variant="ghost"
            className="flex text-left justify-start px-3 w-full -ml-2 items-center space-x-2"
          >
            <Settings size={14} />
            <span>Settings</span>
          </Button>
        </li>
      </nav>
    </menu>
  );
}

export function CommandMenu({
  open,
  setOpen,
}: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }) {
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Calculator</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

async function block(request: Request) {
  const user = await validateRequest(request);
  // example: be more restrictive on the access
  // if (user.id !== "1d36496d-24d7-4961-85cc-d9e178320b21") {
  //   throw new Response(null, { status: 403 });
  // }
  return user;
}
