namespace TransactionTypeService.Api.Dtos;

public class TransactionTypeDto
{
    public required string TypeCode { get; set; }
    public required string Description { get; set; }
}

public class TransactionTypePageDto
{
    public IEnumerable<TransactionTypeDto> Items { get; set; } = new List<TransactionTypeDto>();
    public bool HasNext { get; set; }
    public bool HasPrevious { get; set; }
    public string? NextCursor { get; set; }
    public string? PrevCursor { get; set; }
}

public class CreateTransactionTypeRequest
{
    public required string TypeCode { get; set; }
    public required string Description { get; set; }
}

public class UpdateTransactionTypeRequest
{
    public required string Description { get; set; }
    public bool CreateIfMissing { get; set; } = false;
}

public class ErrorResponseDto
{
    public required string Code { get; set; }
    public required string Message { get; set; }
    public string? Field { get; set; }
    public required string TraceId { get; set; }
}
