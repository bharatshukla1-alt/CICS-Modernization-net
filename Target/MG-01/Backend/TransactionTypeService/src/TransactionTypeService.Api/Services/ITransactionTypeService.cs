using TransactionTypeService.Api.Dtos;

namespace TransactionTypeService.Api.Services;

public interface ITransactionTypeService
{
    Task<TransactionTypePageDto> GetTransactionTypesAsync(string? typeCode, string? description, string? cursor, string? direction, int? size);
    Task<TransactionTypeDto> GetTransactionTypeAsync(string typeCode);
    Task<TransactionTypeDto> CreateTransactionTypeAsync(CreateTransactionTypeRequest request);
    Task<(TransactionTypeDto? dto, bool changed)> UpdateTransactionTypeAsync(string typeCode, UpdateTransactionTypeRequest request);
    Task DeleteTransactionTypeAsync(string typeCode);
}
