<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Exports\CompletedServicesExport;
use App\Exports\OpenOrdersExport;
use App\Exports\SalesReportExport;
use App\Exports\StaffActivityExport;
use App\Http\Requests\ReportFilterRequest;
use App\Models\Order;
use App\Models\Setting;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Reports on sales, pending orders, completed services and staff activity,
 * exportable to PDF and Excel.
 */
class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    public function index(ReportFilterRequest $request): Response
    {
        [$from, $to] = $request->range();
        $sales = $this->reports->salesReport($from, $to);
        $billed = array_sum(array_column($sales, 'billed'));
        $orders = array_sum(array_column($sales, 'orders'));

        return Inertia::render('reports/index', [
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'collected' => array_sum(array_column($sales, 'collected')),
                'billed' => $billed,
                'orders' => $orders,
                'average_order' => $orders > 0 ? round($billed / $orders, 2) : 0,
                'discounts' => array_sum(array_column($sales, 'discounts')),
                'express_fees' => array_sum(array_column($sales, 'express_fees')),
            ],
            'sales' => $sales,
            'topServices' => $this->reports->topServices($from, $to, 10),
            'topCustomers' => $this->reports->topCustomers($from, $to, 10),
            'paymentMethods' => $this->reports->paymentMethods($from, $to),
            'peakHours' => $this->reports->peakHours($from, $to),
            'completedServices' => $this->reports->completedServices($from, $to),
            'pendingByStatus' => Order::query()->open()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function daily(ReportFilterRequest $request): Response
    {
        return Inertia::render('reports/daily', [
            'summary' => $this->reports->dailySummary($request->reportDate()),
        ]);
    }

    public function staff(ReportFilterRequest $request): Response
    {
        [$from, $to] = $request->range();

        return Inertia::render('reports/staff', [
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'staff' => $this->reports->staffActivity($from, $to),
        ]);
    }

    /**
     * GET /reports/export/{report}?format=pdf|xlsx&from=&to=
     */
    public function export(ReportFilterRequest $request, string $report): HttpResponse|BinaryFileResponse
    {
        $format = $request->input('format', 'pdf');
        [$from, $to] = $request->range();
        $period = $from->toDateString().'_to_'.$to->toDateString();

        // Cashiers may only export the daily summary.
        abort_unless(
            $report === 'daily' || $request->user()->can(Permission::ReportsExport->value),
            403,
        );

        if ($report === 'daily') {
            $summary = $this->reports->dailySummary($request->reportDate());

            return $this->pdf('pdf.daily-summary', ['summary' => $summary], "daily-summary-{$summary['date']}.pdf");
        }

        if ($format === 'xlsx') {
            $export = match ($report) {
                'sales' => new SalesReportExport($this->reports->salesReport($from, $to)),
                'services' => new CompletedServicesExport($this->reports->completedServices($from, $to)),
                'staff' => new StaffActivityExport($this->reports->staffActivity($from, $to)),
                'pending' => new OpenOrdersExport,
                default => abort(404),
            };

            return Excel::download($export, "{$report}-report-{$period}.xlsx");
        }

        [$title, $columns, $rows] = match ($report) {
            'sales' => ['Sales Report', SalesReportExport::HEADINGS, array_map(SalesReportExport::row(...), $this->reports->salesReport($from, $to))],
            'services' => ['Completed Services', CompletedServicesExport::HEADINGS, array_map(CompletedServicesExport::row(...), $this->reports->completedServices($from, $to))],
            'staff' => ['Staff Activity', StaffActivityExport::HEADINGS, array_map(StaffActivityExport::row(...), $this->reports->staffActivity($from, $to))],
            'pending' => ['Pending Orders', OpenOrdersExport::HEADINGS, $this->pendingRows()],
            default => abort(404),
        };

        return $this->pdf('pdf.report', [
            'title' => $title,
            'period' => $report === 'pending' ? 'As of '.now()->format('M j, Y g:i A') : $from->format('M j, Y').' – '.$to->format('M j, Y'),
            'columns' => $columns,
            'rows' => $rows,
            'statuses' => OrderStatus::options(),
        ], "{$report}-report-{$period}.pdf", landscape: $report !== 'services');
    }

    /**
     * @return list<list<string|float>>
     */
    private function pendingRows(): array
    {
        $export = new OpenOrdersExport;

        return array_values($export->query()->get()->map(fn (Order $order) => $export->map($order))->all());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function pdf(string $view, array $data, string $filename, bool $landscape = false): HttpResponse
    {
        return Pdf::loadView($view, [...$data, 'shopName' => Setting::get('shop_name'), 'currency' => Setting::get('currency_symbol', '₱')])
            ->setPaper('a4', $landscape ? 'landscape' : 'portrait')
            ->download($filename);
    }
}
