import { useEffect, useState } from "react";
import { fetchTarieven } from "@/services/werkplaatsPrijsService";

/**
 * Bedrijfsinstelling "Eigen schadeherstel-afdeling: ja/nee".
 * `null` zolang de instelling nog laadt (voorkomt flikkeren van menu's).
 */
export const useEigenSchadeherstel = (): { eigen: boolean | null; loading: boolean } => {
  const [eigen, setEigen] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetchTarieven()
      .then((t) => { if (active) setEigen(t.eigen_schadeherstel); })
      .catch(() => { if (active) setEigen(true); });
    return () => { active = false; };
  }, []);

  return { eigen, loading: eigen === null };
};
