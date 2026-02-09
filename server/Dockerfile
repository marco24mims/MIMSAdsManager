# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev git

# Copy go mod file only first
COPY go.mod ./

# Download dependencies (this will also create go.sum)
RUN go mod download

# Copy source code
COPY . .

# Tidy up modules
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Copy the binary from builder
COPY --from=builder /app/server .

# Copy static files
COPY --from=builder /app/static ./static

# Create uploads directory
RUN mkdir -p ./uploads

# Expose port
EXPOSE 8080

# Run the application
CMD ["./server"]
