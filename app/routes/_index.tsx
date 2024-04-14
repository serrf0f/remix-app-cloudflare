import { Button } from "@radix-ui/themes";
import { Link } from "@remix-run/react";
import { Bookmark } from "lucide-react";

export default function Index() {
  return (
    <div className="flex w-full h-dvh items-center justify-center">
      <Link to="/dashboard">
        <Button variant="classic">
          <Bookmark /> Dashboard
        </Button>
      </Link>
    </div>
  );
}
