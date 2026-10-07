using System.Text.RegularExpressions;
using TransactionTypeService.Api.Dtos;

namespace TransactionTypeService.Api.Validation;

public static class TransactionTypeValidation
{
    public static string NormalizeTypeCode(string typeCode)
    {
        if (string.IsNullOrWhiteSpace(typeCode))
            throw new ValidationException("TYPE_CODE_REQUIRED", "Enter a transaction type code.", "typeCode");

        typeCode = typeCode.Trim();
        if (typeCode.Length == 1 && char.IsDigit(typeCode[0]))
        {
            typeCode = "0" + typeCode;
        }

        if (!Regex.IsMatch(typeCode, "^[0-9]{2}$"))
        {
            throw new ValidationException("TYPE_CODE_NOT_NUMERIC", "Transaction type code must be numeric.", "typeCode");
        }

        if (typeCode == "00")
        {
            throw new ValidationException("TYPE_CODE_ZERO", "Transaction type code cannot be zero.", "typeCode");
        }

        return typeCode;
    }

    public static void ValidateDescription(string description)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ValidationException("DESCRIPTION_REQUIRED", "Enter a description.", "description");
        
        description = description.Trim();
        if (description.Length > 50)
            throw new ValidationException("DESCRIPTION_TOO_LONG", "Description must be 50 characters or fewer.", "description");

        if (!Regex.IsMatch(description, "^[A-Za-z0-9 ]+$"))
            throw new ValidationException("DESCRIPTION_INVALID_CHARS", "Description can contain letters, numbers, and spaces only.", "description");
    }
}

public class ValidationException : Exception
{
    public string ErrorCode { get; }
    public string Field { get; }

    public ValidationException(string errorCode, string message, string field) : base(message)
    {
        ErrorCode = errorCode;
        Field = field;
    }
}
