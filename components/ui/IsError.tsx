export default function IsError() {
    return (
        <tr className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <td colSpan={11} className="px-6 py-4 text-center">
                <p className="text-red-600">Error loading tandas data</p>
            </td>
        </tr>
    );
}