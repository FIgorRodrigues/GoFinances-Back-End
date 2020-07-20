import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateCategoryService from './CreateCategoryService';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category: titleCategory,
  }: Request): Promise<Transaction> {
    const transactionsTypes = ['income', 'outcome'];

    if (!transactionsTypes.includes(type))
      throw new AppError(
        'A transaction must be of the type income or outcome',
        400,
      );

    const transactionRepository = getCustomRepository(TransactionsRepository);

    if (type === 'outcome') {
      const { total } = await transactionRepository.getBalance();
      if (total < value)
        throw new AppError('You do not have enough balance', 400);
    }

    const createCategoryService = new CreateCategoryService();
    const category = await createCategoryService.execute({
      title: titleCategory,
    });

    const transaction = await transactionRepository.create({
      title,
      value,
      type,
      category_id: category.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
