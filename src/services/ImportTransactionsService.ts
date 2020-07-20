import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import { createReadStream, promises } from 'fs';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface Request {
  filePath: string;
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const csvTransactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const readCSVStream = createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('error', error => {
      throw new AppError(error.message, 400);
    });

    parseCSV.on('data', async (line: string[]) => {
      const [title, type, value, category] = line;

      if (!title || !type || !value || !category)
        throw new AppError(
          'Failed to read the csv file, check if the format is valid',
          400,
        );

      csvTransactions.push({
        title,
        type: type as 'income' | 'outcome',
        value: parseFloat(value),
        category,
      });

      categories.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoryRepository = getRepository(Category);

    const existentCategories = await categoryRepository.find({
      where: { title: In(categories) },
    });

    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = await categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const transactionRepository = getCustomRepository(TransactionRepository);

    const transactions = await transactionRepository.create(
      csvTransactions.map(csvTransaction => ({
        title: csvTransaction.title,
        type: csvTransaction.type,
        value: csvTransaction.value,
        category: finalCategories.find(
          category => category.title === csvTransaction.category,
        ),
      })),
    );

    await transactionRepository.save(transactions);

    await promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
