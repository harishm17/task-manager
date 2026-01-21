import { Button, Input, Select } from '../common/DesignSystem';

type ExpenseFiltersProps = {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    categoryFilter: string;
    setCategoryFilter: (val: string) => void;
    paidByFilter: string;
    setPaidByFilter: (val: string) => void;
    dateFrom: string;
    setDateFrom: (val: string) => void;
    dateTo: string;
    setDateTo: (val: string) => void;
    categories: Array<{ id: string; name: string }>;
    people: Array<{ id: string; display_name: string }>;
    onClear: () => void;
    hasFilters: boolean;
};

export function ExpenseFilters({
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    paidByFilter,
    setPaidByFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    categories,
    people,
    onClear,
    hasFilters,
}: ExpenseFiltersProps) {
    return (
        <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
            <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
            />
            <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9"
            >
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select
                value={paidByFilter}
                onChange={(e) => setPaidByFilter(e.target.value)}
                className="h-9"
            >
                <option value="all">Paid by Anyone</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </Select>
            <div className="flex gap-2">
                <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9"
                    placeholder="From"
                />
                <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9"
                    placeholder="To"
                />
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={!hasFilters}
                className="h-9"
            >
                Clear Filters
            </Button>
        </div>
    );
}
