import { useIdentity, type Installation } from "@/hooks/useIdentity";

type InstallationTableRowProps = {
  clientInstallationId: string;
  installation: Installation;
  refreshInstallations: () => Promise<void>;
};

const InstallationTableRow: React.FC<InstallationTableRowProps> = ({
  clientInstallationId,
  installation,
  refreshInstallations,
}) => {
  const { revokeInstallation, revoking } = useIdentity();

  const handleRevokeInstallation = async (installationIdBytes: Uint8Array) => {
    await revokeInstallation(installationIdBytes);
    await refreshInstallations();
  };


  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3 max-w-[12rem] sm:max-w-[20rem]">
        {installation.id}
      </td>
      <td className="px-4 py-3 w-[100px]">
        {installation.id !== clientInstallationId && (
          <button
            className={`px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 ${
              revoking ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={revoking}
            onClick={() => void handleRevokeInstallation(installation.bytes)}
          >
            {revoking ? "Revoking..." : "Revoke"}
          </button>
        )}
      </td>
    </tr>
  );
};

type InstallationTableProps = {
  clientInstallationId: string;
  installations: Installation[];
  refreshInstallations: () => Promise<void>;
};

export const InstallationTable: React.FC<InstallationTableProps> = ({
  clientInstallationId,
  installations,
  refreshInstallations,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2">Installation ID</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {installations.map((installation) => (
            <InstallationTableRow
              key={installation.id}
              clientInstallationId={clientInstallationId}
              installation={installation}
              refreshInstallations={refreshInstallations}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};