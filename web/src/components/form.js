function Button({ name, onClick, className }) {
    const cls = [
        "text-xs bg-button-bg text-button border-button-border border py-1 px-3"
    ]
    if (className) cls.push(className)

    return (
        <button className={cls.join(" ")} onClick={onClick}>
            {name}
        </button>
    )
}

export { Button }
