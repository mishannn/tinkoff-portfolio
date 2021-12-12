export interface PortfolioReportItem {
  currency: string;
  price: number;
  yield: number;
}

export interface PortfolioReportPosition extends PortfolioReportItem {
  name: string;
  ticker: string;
}

export interface PortfolioReport extends PortfolioReportItem {
  positions: PortfolioReportPosition[];
  accountBalance: {
    currency: string;
    price: number;
  };
}
