import { Link } from "@remix-run/react";
import { ArrowRight } from "lucide-react";
import { Button } from "~/@shadcn/ui/button";

export default function Index() {
  return (
    <div className="flex w-full h-dvh items-center justify-center">
      <Link to="/dashboard">
        <Button className="flex items-center space-x-1">
          <span>Go to dashboard</span>
          <ArrowRight size={12} />
        </Button>
      </Link>
    </div>
  );
}
