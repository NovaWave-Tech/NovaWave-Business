export type Category = {
  idcategoria: number;
  nome: string;
  descricao?: string | null;
  situacao: number;
  produtos: number;
};

export type Brand = {
  idmarca: number;
  nome: string;
  situacao: number;
  produtos: number;
};

export type CatalogData = {
  categories: Category[];
  brands: Brand[];
};
