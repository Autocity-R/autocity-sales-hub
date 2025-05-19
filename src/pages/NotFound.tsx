
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md text-center">
        <img
          src="/lovable-uploads/8185527b-da48-494a-b7fa-309b4702b4c3.png"
          alt="AutoCity Logo"
          className="h-12 mx-auto mb-6"
        />
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mt-4">Pagina niet gevonden</h2>
        <p className="text-gray-500 mt-2 mb-6">
          De pagina die je zoekt lijkt niet te bestaan of is verplaatst.
        </p>
        <Button asChild>
          <Link to="/">
            Terug naar dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
