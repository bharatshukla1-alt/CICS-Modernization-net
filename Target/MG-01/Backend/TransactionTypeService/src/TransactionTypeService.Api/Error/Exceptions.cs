namespace TransactionTypeService.Api.Error;

public class TransactionTypeNotFoundException : Exception
{
    public TransactionTypeNotFoundException() : base("No record exists for this code.") { }
}

public class TransactionTypeExistsException : Exception
{
    public TransactionTypeExistsException() : base("A transaction type with this code already exists.") { }
}

public class TransactionTypeHasDependentsException : Exception
{
    public TransactionTypeHasDependentsException() : base("This transaction type is in use and cannot be deleted while related records exist.") { }
}

public class ConcurrentDeleteException : Exception
{
    public ConcurrentDeleteException() : base("This record was removed by someone else. Refresh and try again.") { }
}

public class LockConflictException : Exception
{
    public LockConflictException() : base("This record is being changed by someone else. Try again shortly.") { }
}

public class NoChangeException : Exception
{
    public NoChangeException() : base("No change detected with respect to database values") { }
}
