output "instance_public_ip" {
  value       = aws_instance.server.public_ip
  description = "作成されたEC2インスタンスのパブリックIPアドレス"
}
