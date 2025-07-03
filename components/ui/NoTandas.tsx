export default function NoTandas() {
    return (
        <tr className="bg-white rounded-md border border-gray-200 overflow-hidden">
            <td colSpan={11} className="px-6 py-8 text-center">
                <p className="text-gray-500">No active tandas found</p>
            </td>
        </tr>
    );
}