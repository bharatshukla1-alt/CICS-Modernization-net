using Microsoft.EntityFrameworkCore;
using TransactionTypeService.Api.Dtos;
using TransactionTypeService.Api.Error;
using TransactionTypeService.Api.Models;
using TransactionTypeService.Api.Repositories;
using TransactionTypeService.Api.Validation;

namespace TransactionTypeService.Api.Services;

public class TransactionTypeService : ITransactionTypeService
{
    private readonly TransactionTypeContext _context;

    public TransactionTypeService(TransactionTypeContext context)
    {
        _context = context;
    }

    public async Task<TransactionTypePageDto> GetTransactionTypesAsync(string? typeCode, string? description, string? cursor, string? direction, int? size)
    {
        if (typeCode != null && typeCode.Trim() == "") typeCode = null;
        if (typeCode != null)
        {
            typeCode = typeCode.Trim();
            if (!System.Text.RegularExpressions.Regex.IsMatch(typeCode, "^[0-9]{2}$"))
                throw new ValidationException("INVALID_TYPE_CODE_FILTER", "Type code must be a 2-digit number.", "typeCode");
        }

        if (description != null) description = description.Trim();

        direction = direction?.ToLower() ?? "forward";
        if (direction != "forward" && direction != "backward")
            throw new ValidationException("INVALID_DIRECTION", "Invalid paging direction.", "direction");

        int limit = size ?? 7;
        if (limit < 1 || limit > 7)
            throw new ValidationException("INVALID_PAGE_SIZE", "Page size must be between 1 and 7.", "size");

        if (cursor != null)
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(cursor, "^[0-9]{2}$"))
                throw new ValidationException("INVALID_CURSOR", "Invalid paging cursor.", "cursor");
        }

        var query = _context.TransactionTypes.AsNoTracking().AsQueryable();

        if (typeCode != null)
            query = query.Where(t => t.TypeCode == typeCode);

        if (!string.IsNullOrEmpty(description))
            query = query.Where(t => t.Description.ToLower().Contains(description.ToLower()));

        if (typeCode != null || !string.IsNullOrEmpty(description))
        {
            var count = await query.CountAsync();
            if (count == 0)
            {
                return new TransactionTypePageDto { Items = new List<TransactionTypeDto>(), HasNext = false, HasPrevious = false };
            }
        }

        if (direction == "forward")
        {
            if (cursor != null) query = query.Where(t => string.Compare(t.TypeCode, cursor) > 0);
            query = query.OrderBy(t => t.TypeCode);
        }
        else
        {
            if (cursor != null) query = query.Where(t => string.Compare(t.TypeCode, cursor) < 0);
            query = query.OrderByDescending(t => t.TypeCode);
        }

        var results = await query.Take(limit + 1).ToListAsync();

        bool hasMore = results.Count > limit;
        if (hasMore) results.RemoveAt(results.Count - 1);

        if (direction == "backward")
        {
            results.Reverse();
        }

        var items = results.Select(t => new TransactionTypeDto { TypeCode = t.TypeCode, Description = t.Description }).ToList();

        bool hasPrevious = true;
        if (direction == "forward" && cursor == null) hasPrevious = false;
        if (direction == "backward" && !hasMore) hasPrevious = false;

        bool hasNext = true;
        if (direction == "forward" && !hasMore) hasNext = false;
        if (direction == "backward" && cursor == null) hasNext = false; // first page

        return new TransactionTypePageDto
        {
            Items = items,
            HasNext = hasNext,
            HasPrevious = hasPrevious,
            NextCursor = items.Count > 0 ? items.Last().TypeCode : null,
            PrevCursor = items.Count > 0 ? items.First().TypeCode : null
        };
    }

    public async Task<TransactionTypeDto> GetTransactionTypeAsync(string typeCode)
    {
        typeCode = TransactionTypeValidation.NormalizeTypeCode(typeCode);
        var t = await _context.TransactionTypes.AsNoTracking().FirstOrDefaultAsync(x => x.TypeCode == typeCode);
        if (t == null) throw new TransactionTypeNotFoundException();

        return new TransactionTypeDto { TypeCode = t.TypeCode, Description = t.Description };
    }

    public async Task<TransactionTypeDto> CreateTransactionTypeAsync(CreateTransactionTypeRequest request)
    {
        string code = TransactionTypeValidation.NormalizeTypeCode(request.TypeCode);
        TransactionTypeValidation.ValidateDescription(request.Description);

        var t = new TransactionType { TypeCode = code, Description = request.Description.Trim() };
        _context.TransactionTypes.Add(t);
        
        await _context.SaveChangesAsync();

        return new TransactionTypeDto { TypeCode = t.TypeCode, Description = t.Description };
    }

    public async Task<(TransactionTypeDto? dto, bool changed)> UpdateTransactionTypeAsync(string typeCode, UpdateTransactionTypeRequest request)
    {
        typeCode = TransactionTypeValidation.NormalizeTypeCode(typeCode);
        TransactionTypeValidation.ValidateDescription(request.Description);
        
        var newDesc = request.Description.Trim();

        var t = await _context.TransactionTypes.FirstOrDefaultAsync(x => x.TypeCode == typeCode);
        if (t == null)
        {
            if (!request.CreateIfMissing) throw new ConcurrentDeleteException();
            
            var newT = new TransactionType { TypeCode = typeCode, Description = newDesc };
            _context.TransactionTypes.Add(newT);
            await _context.SaveChangesAsync();
            return (new TransactionTypeDto { TypeCode = newT.TypeCode, Description = newT.Description }, true);
        }

        if (t.Description.Equals(newDesc, StringComparison.OrdinalIgnoreCase))
        {
            return (null, false);
        }

        t.Description = newDesc;
        await _context.SaveChangesAsync();

        return (new TransactionTypeDto { TypeCode = t.TypeCode, Description = t.Description }, true);
    }

    public async Task DeleteTransactionTypeAsync(string typeCode)
    {
        typeCode = TransactionTypeValidation.NormalizeTypeCode(typeCode);
        var t = await _context.TransactionTypes.FirstOrDefaultAsync(x => x.TypeCode == typeCode);
        if (t == null) throw new TransactionTypeNotFoundException();

        _context.TransactionTypes.Remove(t);
        await _context.SaveChangesAsync();
    }
}
