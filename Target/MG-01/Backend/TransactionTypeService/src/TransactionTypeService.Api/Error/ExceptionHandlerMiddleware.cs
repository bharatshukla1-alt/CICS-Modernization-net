using Microsoft.AspNetCore.Diagnostics;
using System.Net;
using TransactionTypeService.Api.Dtos;
using TransactionTypeService.Api.Validation;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TransactionTypeService.Api.Error;

public class ExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;

    public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        try
        {
            await _next(httpContext);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(httpContext, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        string traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        var response = new ErrorResponseDto
        {
            Code = "INTERNAL_ERROR",
            Message = "Something went wrong. Please try again.",
            TraceId = traceId
        };

        if (exception is ValidationException ve)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            response.Code = ve.ErrorCode;
            response.Message = ve.Message;
            response.Field = ve.Field;
        }
        else if (exception is TransactionTypeNotFoundException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            response.Code = "TXN_TYPE_NOT_FOUND";
            response.Message = exception.Message;
        }
        else if (exception is TransactionTypeExistsException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            response.Code = "TXN_TYPE_ALREADY_EXISTS";
            response.Message = exception.Message;
        }
        else if (exception is TransactionTypeHasDependentsException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            response.Code = "TXN_TYPE_HAS_DEPENDENTS";
            response.Message = exception.Message;
        }
        else if (exception is ConcurrentDeleteException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            response.Code = "TXN_TYPE_CONCURRENTLY_DELETED";
            response.Message = exception.Message;
        }
        else if (exception is LockConflictException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            response.Code = "TXN_TYPE_LOCK_CONFLICT";
            response.Message = exception.Message;
        }
        else if (exception is DbUpdateException dbEx && dbEx.InnerException is PostgresException pgEx)
        {
            if (pgEx.SqlState == "23505")
            {
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response.Code = "TXN_TYPE_ALREADY_EXISTS";
                response.Message = "A transaction type with this code already exists.";
            }
            else if (pgEx.SqlState == "23503")
            {
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response.Code = "TXN_TYPE_HAS_DEPENDENTS";
                response.Message = "This transaction type is in use and cannot be deleted while related records exist.";
            }
            else if (pgEx.SqlState == "40P01" || pgEx.SqlState == "55P03" || pgEx.SqlState == "40001")
            {
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response.Code = "TXN_TYPE_LOCK_CONFLICT";
                response.Message = "This record is being changed by someone else. Try again shortly.";
            }
            else
            {
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.Code = "TXN_TYPE_DB_ERROR";
                if (context.Request.Method == "POST") response.Message = "Something went wrong. Please try again.";
                else if (context.Request.Method == "PUT") response.Message = "Something went wrong and your change was not saved. Please try again.";
                else response.Message = "Something went wrong. Please try again.";
            }
        }
        else if (exception is NpgsqlException || exception.InnerException is NpgsqlException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.ServiceUnavailable;
            response.Code = "SERVICE_UNAVAILABLE";
            response.Message = "The service is temporarily unavailable. Please try again shortly.";
        }
        else
        {
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        }

        _logger.LogError(exception, "Error handling request. TraceId: {TraceId}", traceId);

        return context.Response.WriteAsJsonAsync(response);
    }
}
