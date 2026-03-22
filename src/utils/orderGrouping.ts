interface OrderItem {
  name: string;
  quantity: number;
  source: string;
  colorNumber?: string | null;
  itemCode?: string | null;
  colorOrder?: number | null;
}

interface ArticleGroup {
  name: string;
  itemCode?: string | null;
  colors: { color: string; quantity: number }[];
}

interface GroupedOrder {
  itemsBySource: Record<string, Record<string, ArticleGroup>>;
  articleNameCounts: Record<string, Set<string>>;
}

/**
 * Group order items by source, then by article (name + code), aggregating colors.
 */
export function groupOrderItems(orderItems: OrderItem[], notAvailableLabel: string): GroupedOrder {
  const itemsBySource: Record<string, Record<string, ArticleGroup>> = {};
  const articleNameCounts: Record<string, Set<string>> = {};

  for (const item of orderItems) {
    if (!itemsBySource[item.source]) {
      itemsBySource[item.source] = {};
    }

    if (!articleNameCounts[item.name]) {
      articleNameCounts[item.name] = new Set();
    }
    articleNameCounts[item.name].add(item.itemCode || '');

    const articleKey = `${item.name}|${item.itemCode || ''}`;
    if (!itemsBySource[item.source][articleKey]) {
      itemsBySource[item.source][articleKey] = {
        name: item.name,
        itemCode: item.itemCode,
        colors: [],
      };
    }

    itemsBySource[item.source][articleKey].colors.push({
      color: item.colorNumber || notAvailableLabel,
      quantity: item.quantity,
    });
  }

  return { itemsBySource, articleNameCounts };
}
