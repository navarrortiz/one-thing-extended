/**
 * @param {object} container - Parent container actor
 * @param {object} child - Child actor to add
 */
export function addChild(container, child) {
    if (typeof container.add_child === 'function')
        container.add_child(child);
    else
        container.add_actor(child);
}
