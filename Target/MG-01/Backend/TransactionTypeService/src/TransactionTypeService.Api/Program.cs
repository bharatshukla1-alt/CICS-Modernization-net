using Microsoft.EntityFrameworkCore;
using TransactionTypeService.Api.Error;
using TransactionTypeService.Api.Repositories;
using TransactionTypeService.Api.Security;
using TransactionTypeService.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure EF Core with PostgreSQL
builder.Services.AddDbContext<TransactionTypeContext>(options =>
    options.UseInMemoryDatabase("CICS_DB"));

// Configure Authentication & Authorization
builder.Services.AddSecurityConfiguration(builder.Configuration);

// Register application services
builder.Services.AddScoped<ITransactionTypeService, TransactionTypeService.Api.Services.TransactionTypeService>();

// Add DB Health Check
builder.Services.AddHealthChecks()
    .AddDbContextCheck<TransactionTypeContext>("Database");

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseMiddleware<ExceptionHandlerMiddleware>();

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
